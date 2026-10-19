import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyIncomingMessage } from "./message-state.js";

const room = { id: "lunch", participants: [], messages: [] };
const message = {
  id: "m1",
  roomId: "lunch",
  senderId: "a",
  originalText: "Hello",
  translatedText: "Hola",
  sourceLanguage: { code: "en", name: "English" },
  targetLanguage: { code: "es", name: "Spanish" },
  createdAt: new Date(0).toISOString(),
};

describe("applyIncomingMessage", () => {
  it("adds a message to the matching room", () => {
    assert.deepEqual(applyIncomingMessage(room, message)?.messages, [message]);
  });

  it("ignores messages for another room and duplicate delivery", () => {
    assert.equal(applyIncomingMessage(room, { ...message, roomId: "other" }), room);
    const withMessage = { ...room, messages: [message] };
    assert.equal(applyIncomingMessage(withMessage, message), withMessage);
  });

  it("does nothing when the client has not joined a room", () => {
    assert.equal(applyIncomingMessage(null, message), null);
  });
});
