import "dotenv/config";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import type { ChatMessage, ClientToServerEvents, Language, ServerToClientEvents } from "@crosstalk/shared";
import { createApp } from "./app.js";
import { RoomStore } from "./room-store.js";
import { createTranslationProvider } from "./translation.js";

const languageSchema = z.object({
  code: z.string().trim().min(2).max(12),
  name: z.string().trim().min(1).max(40),
});
const roomJoinSchema = z.object({
  roomId: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  displayName: z.string().trim().min(1).max(40),
  language: languageSchema,
});

const messageSchema = z.object({
  text: z.string().trim().min(1).max(300, {
    message: "Messages must be 300 characters or fewer.",
  }),
  replyToMessageId: z.string().optional(),
  intentMarker: z.enum(["clarification", "change-of-mind"]).optional(),
});


const app = createApp();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" },
});
const rooms = new RoomStore();
const translator = createTranslationProvider();

io.on("connection", (socket) => {
  let activeRoomId: string | undefined;

  socket.on("room:join", (payload) => {
    const parsed = roomJoinSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit("room:error", { code: "INVALID_JOIN", message: "Check the room name, display name, and language." });
      return;
    }

    if (activeRoomId && activeRoomId !== parsed.data.roomId) {
      rooms.leave(activeRoomId, socket.id);
      socket.leave(activeRoomId);
      activeRoomId = undefined;
    }

    const participant = {
      id: socket.id,
      displayName: parsed.data.displayName,
      language: parsed.data.language,
    };
    const joined = rooms.join(parsed.data.roomId, participant);
    if (!joined.ok) {
      socket.emit("room:error", { code: joined.code, message: joined.message });
      return;
    }

    activeRoomId = parsed.data.roomId;
    socket.join(activeRoomId);
    io.to(activeRoomId).emit("room:state", joined.room);
  });

  socket.on("room:language", (payload) => {
    const parsed = languageSchema.safeParse(payload.language);
    if (!activeRoomId || !parsed.success) {
      socket.emit("room:error", { code: "INVALID_LANGUAGE", message: "Choose a valid language after joining a room." });
      return;
    }
    const room = rooms.setLanguage(activeRoomId, socket.id, parsed.data as Language);
    if (room) io.to(activeRoomId).emit("room:state", room);
  });

  socket.on("message:send", async (payload) => {
    const parsed = messageSchema.safeParse(payload);
    const room = activeRoomId ? rooms.get(activeRoomId) : undefined;
    const sender = room?.participants.find((participant) => participant.id === socket.id);
    if (!parsed.success || !room || !sender) {
      socket.emit("room:error", { code: "INVALID_MESSAGE", message: "Join a room and send a message of up to 2000 characters." });
      return;
    }
    if (parsed.data.replyToMessageId && !room.messages.some((message) => message.id === parsed.data.replyToMessageId)) {
      socket.emit("room:error", { code: "INVALID_REPLY", message: "The message you are replying to is not in this room." });
      return;
    }

    const recipient = room.participants.find((participant) => participant.id !== sender.id);
    const targetLanguage = recipient?.language ?? sender.language;
    let translatedText: string;

try {
  translatedText = await translator.translate(
    parsed.data.text,
    sender.language,
    targetLanguage
  );
} catch (error) {
  console.error("Translation failed:", error);

  // Preserve the original message if translation is unavailable.
  translatedText = parsed.data.text;
}

    const message: ChatMessage = {
      id: randomUUID(),
      roomId: room.id,
      senderId: sender.id,
      originalText: parsed.data.text,
      translatedText,
      sourceLanguage: sender.language,
      targetLanguage,
      replyToMessageId: parsed.data.replyToMessageId,
      intentMarker: parsed.data.intentMarker,
      createdAt: new Date().toISOString(),
    };
    const updatedRoom = rooms.appendMessage(room.id, message);
    if (updatedRoom) io.to(room.id).emit("message:new", message);
  });

  socket.on("disconnect", () => {
    if (!activeRoomId) return;
    const room = rooms.leave(activeRoomId, socket.id);
    if (room) io.to(activeRoomId).emit("room:state", room);
  });
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`CrossTalk server listening on ${port}`);
});
