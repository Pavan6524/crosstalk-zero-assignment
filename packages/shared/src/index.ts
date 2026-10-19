export type Language = {
  code: string;
  name: string;
};

export type IntentMarker = "clarification" | "change-of-mind";

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  replyToMessageId?: string;
  intentMarker?: IntentMarker;
  createdAt: string;
};

export type RoomParticipant = {
  id: string;
  displayName: string;
  language: Language;
};

export type ChatRoom = {
  id: string;
  participants: RoomParticipant[];
  messages: ChatMessage[];
};

export type ClientToServerEvents = {
  "room:join": (payload: { roomId: string; displayName: string; language: Language }) => void;
  "room:language": (payload: { language: Language }) => void;
  "message:send": (payload: {
    text: string;
    replyToMessageId?: string;
    intentMarker?: IntentMarker;
  }) => void;
};

export type ServerToClientEvents = {
  "room:state": (room: ChatRoom) => void;
  "room:error": (payload: { code: string; message: string }) => void;
  "message:new": (message: ChatMessage) => void;
};
