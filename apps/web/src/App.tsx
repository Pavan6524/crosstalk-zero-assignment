import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  ChatRoom,
  ClientToServerEvents,
  IntentMarker,
  Language,
  ServerToClientEvents,
} from "@crosstalk/shared";
import { applyIncomingMessage } from "./message-state.js";

const languages: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" },
  { code: "fr", name: "French" },
  { code: "ja", name: "Japanese" },
  { code: "de", name: "German" },
  { code: "ar", name: "Arabic" },
];

type JoinDetails = { roomId: string; displayName: string; language: Language };

function App() {
  const socket = useMemo<Socket<ServerToClientEvents, ClientToServerEvents>>(
    () => io(import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001", { autoConnect: false }),
    [],
  );
  const pendingJoin = useRef<JoinDetails | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [connection, setConnection] = useState("offline");
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [error, setError] = useState("");
  const [roomId, setRoomId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [intentMarker, setIntentMarker] = useState<IntentMarker | "">("");

  useEffect(() => {
    const onConnect = () => {
      setConnection("online");
      if (pendingJoin.current) socket.emit("room:join", pendingJoin.current);
    };
    const onDisconnect = () => setConnection("offline");
    const onRoomState = (nextRoom: ChatRoom) => {
      setRoom(nextRoom);
      setError("");
    };
    const onRoomError = (payload: { code: string; message: string }) => setError(payload.message);
    const onMessage = (message: ChatMessage) => {
      setRoom((current) => applyIncomingMessage(current, message));
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onRoomState);
    socket.on("room:error", onRoomError);
    socket.on("message:new", onMessage);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onRoomState);
      socket.off("room:error", onRoomError);
      socket.off("message:new", onMessage);
      socket.disconnect();
    };
  }, [socket]);

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
}, [room?.messages.length]);
  const myParticipant = room?.participants.find((participant) => participant.id === socket.id);
  const partner = room?.participants.find((participant) => participant.id !== socket.id);
  const language = languages.find((item) => item.code === (myParticipant?.language.code ?? languageCode)) ?? languages[0];

  function joinRoom(event: FormEvent) {
    event.preventDefault();
    setError("");
    const requested: JoinDetails = {
      roomId: roomId.trim(),
      displayName: displayName.trim(),
      language: languages.find((item) => item.code === languageCode) ?? languages[0],
    };
    pendingJoin.current = requested;
    if (socket.connected) socket.emit("room:join", requested);
    else {
      setConnection("connecting");
      socket.connect();
    }
  }

  function changeLanguage(nextCode: string) {
    setLanguageCode(nextCode);
    const nextLanguage = languages.find((item) => item.code === nextCode);
    if (room && nextLanguage) socket.emit("room:language", { language: nextLanguage });
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !room) return;
    socket.emit("message:send", {
      text: draft.trim(),
      replyToMessageId: replyTo?.id,
      intentMarker: intentMarker || undefined,
    });
    setDraft("");
    setReplyTo(null);
    setIntentMarker("");
  }

  function suggestRoom() {
    setRoomId(`talk-${Math.random().toString(36).slice(2, 7)}`);
  }

  if (!room) {
    return (
      <main className="welcome-shell">
        <header className="topbar">
          <a className="wordmark" href="#home"><span className="brand-mark">c</span> crosstalk</a>
          <div className={`connection-pill ${connection}`}><span />{connection === "online" ? "Connected" : connection === "connecting" ? "Connecting" : "Ready when you are"}</div>
        </header>
        <section className="welcome-grid">
          <div className="welcome-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> A little more understood</div>
            <h1>Good conversations<br />have <em>no borders.</em></h1>
            <p>Talk naturally in your own language. CrossTalk keeps the original close and brings everyone into the conversation.</p>
            <div className="welcome-notes">
              <div className="note-icon">↔</div>
              <div><strong>Your words stay yours</strong><span>Original and translation, together.</span></div>
            </div>
            <div className="language-orbit" aria-hidden="true"><span>Hola</span><span>नमस्ते</span><span>Hello</span><span>Bonjour</span></div>
          </div>
          <form className="join-card" onSubmit={joinRoom}>
            <div className="card-kicker">START A CONVERSATION</div>
            <h2>Find your room</h2>
            <p className="card-subtitle">Join someone, or share a room name to meet here.</p>
            <label>Your name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="What should we call you?" maxLength={40} required /></label>
            <label>Room name<div className="room-input-row"><input value={roomId} onChange={(event) => setRoomId(event.target.value)} placeholder="e.g. sunday-lunch" pattern="[a-zA-Z0-9_-]{3,32}" title="Use 3–32 letters, numbers, hyphens, or underscores" required /><button type="button" className="suggest-button" onClick={suggestRoom} aria-label="Suggest a room name">↗</button></div></label>
            <label>Your language<select value={languageCode} onChange={(event) => changeLanguage(event.target.value)}>{languages.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button" type="submit">Join conversation <span>→</span></button>
            <div className="privacy-note"><span>✳</span> Just two people. No account needed.</div>
          </form>
        </section>
        <footer className="welcome-footer"><span>Made for the moments that matter.</span><span className="footer-languages">EN <b>·</b> ES <b>·</b> HI <b>·</b> FR</span></footer>
      </main>
    );
  }

  return (
    <main className="chat-shell">
      <header className="chat-topbar">
        <a className="wordmark" href="#home" onClick={(event) => { event.preventDefault(); socket.disconnect(); setRoom(null); }}><span className="brand-mark">c</span> crosstalk</a>
        <div className="room-heading"><span className="room-label">YOUR ROOM</span><strong>{room.id}</strong></div>
        <div className={`connection-pill ${connection}`}><span />{connection === "online" ? "Live" : "Reconnecting"}</div>
      </header>
      <section className="conversation-layout">
        <aside className="conversation-sidebar">
          <div className="sidebar-intro"><span className="sidebar-icon">✳</span><span>THE CONVERSATION</span></div>
          <h1>Better together,<br /><em>in any language.</em></h1>
          <p>Say it in the words that feel like you. Your friend will see your message translated alongside the original.</p>
          <div className="people-card">
            <div className="people-card-heading"><span>HERE TOGETHER</span><span>{room.participants.length}/2</span></div>
            {[myParticipant, partner].map((person, index) => person ? (
              <div className="person-row" key={person.id}><div className={`avatar avatar-${index}`}>{person.displayName.slice(0, 1).toUpperCase()}</div><div className="person-info"><strong>{person.displayName}{person.id === socket.id && <small>YOU</small>}</strong><span>{person.language.name}</span></div><span className="online-dot" /></div>
            ) : <div className="waiting-person" key="waiting"><div className="avatar avatar-waiting">· · ·</div><div><strong>Waiting for your person</strong><span>Share the room name to invite them</span></div></div>)}
          </div>
          <label className="language-control">I speak<select value={language.code} onChange={(event) => changeLanguage(event.target.value)}>{languages.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          <div className="sidebar-footnote"><span>↗</span> Originals and translations travel together.</div>
        </aside>
        <section className="chat-panel" aria-label="Chat messages">
          <div className="chat-panel-header"><div><span className="online-dot" /><strong>{partner ? `You and ${partner.displayName}` : "Your private room"}</strong></div><span>MESSAGES STAY IN THIS ROOM</span></div>
          <div className="message-list">
            {room.messages.length === 0 ? <div className="empty-chat"><div className="empty-illustration"><span>あ</span><i>hello</i><b>hola</b></div><h2>A good conversation<br />starts anywhere.</h2><p>Your messages will appear here with their translations.</p></div> : room.messages.map((message) => {
              const mine = message.senderId === socket.id;
              const repliedMessage = room.messages.find((item) => item.id === message.replyToMessageId);
              return <article className={`message-row ${mine ? "mine" : "theirs"}`} key={message.id}>
                <div className="message-avatar">{room.participants.find((person) => person.id === message.senderId)?.displayName.slice(0, 1).toUpperCase() ?? "?"}</div>
                <div className="message-content">
                  <div className="message-meta"><strong>{mine ? "You" : room.participants.find((person) => person.id === message.senderId)?.displayName}</strong><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></div>
                  {repliedMessage && <div className="reply-context"><span>↳ Replying to {repliedMessage.senderId === socket.id ? "you" : room.participants.find((person) => person.id === repliedMessage.senderId)?.displayName}</span><p>{repliedMessage.originalText}</p></div>}
                  <div className={`bubble ${mine ? "bubble-mine" : "bubble-theirs"}`}>
                    {message.intentMarker && <span className={`intent-tag ${message.intentMarker}`}>{message.intentMarker === "clarification" ? "↗ Clarifying" : "↶ I changed my mind"}</span>}
                    <p className="original-text">{message.originalText}</p>
                    {message.translatedText !== message.originalText && <div className="translation"><span>{message.targetLanguage.name}</span><p>{message.translatedText}</p></div>}
                  </div>
                  <button className="reply-button" onClick={() => setReplyTo(message)}>↩ Reply</button>
                </div>
              </article>;
            })}
            <div ref={bottomRef} />
          </div>
          <div className="composer-area">
            {error && <div className="inline-error" role="alert">{error}</div>}
            {replyTo && <div className="replying-to"><span>↩ Replying to {replyTo.senderId === socket.id ? "your message" : room.participants.find((person) => person.id === replyTo.senderId)?.displayName}: “{replyTo.originalText}”</span><button onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button></div>}
            <form className="composer" onSubmit={sendMessage}>
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={partner ? `Write in ${language.name}…` : "Write a message while you wait…"} maxLength={2000} rows={2} aria-label="Message" />
              <div className="composer-bottom"><div className="intent-controls"><button type="button" className={intentMarker === "clarification" ? "selected" : ""} onClick={() => setIntentMarker(intentMarker === "clarification" ? "" : "clarification")}>↗ Clarifying</button><button type="button" className={intentMarker === "change-of-mind" ? "selected" : ""} onClick={() => setIntentMarker(intentMarker === "change-of-mind" ? "" : "change-of-mind")}>↶ Changed my mind</button></div><button className="send-button" type="submit" disabled={!draft.trim() || connection !== "online"}>Send <span>↑</span></button></div>
            </form>
            <div className="composer-hint">Press Enter to send <b>·</b> Shift + Enter for a new line</div>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
