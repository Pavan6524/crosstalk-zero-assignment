import { describe, expect, it } from "vitest";
import { RoomStore } from "./room-store.js";
import type { ChatMessage, Language } from "@crosstalk/shared";

const english: Language = { code: "en", name: "English" };
const hindi: Language = { code: "hi", name: "Hindi" };

describe("RoomStore", () => {
  it("allows two participants and rejects a third", () => {
    const rooms = new RoomStore();
    expect(rooms.join("lunch", { id: "a", displayName: "A", language: english }).ok).toBe(true);
    expect(rooms.join("lunch", { id: "b", displayName: "B", language: hindi }).ok).toBe(true);
    expect(rooms.join("lunch", { id: "c", displayName: "C", language: english })).toEqual({
      ok: false,
      code: "ROOM_FULL",
      message: "This room already has two participants.",
    });
    expect(rooms.get("lunch")?.participants).toHaveLength(2);
  });

  it("updates participant language and retains message history after a participant leaves", () => {
    const rooms = new RoomStore();
    rooms.join("lunch", { id: "a", displayName: "A", language: english });
    rooms.join("lunch", { id: "b", displayName: "B", language: hindi });
    const message: ChatMessage = {
      id: "m1",
      roomId: "lunch",
      senderId: "a",
      originalText: "Hello",
      translatedText: "नमस्ते",
      sourceLanguage: english,
      targetLanguage: hindi,
      createdAt: new Date(0).toISOString(),
    };
    rooms.appendMessage("lunch", message);
    rooms.setLanguage("lunch", "b", english);
    const room = rooms.leave("lunch", "b");
    expect(room?.participants[0].language).toEqual(english);
    expect(room?.messages).toEqual([message]);
  });
});
