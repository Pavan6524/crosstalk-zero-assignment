/**
 * @param {import("@crosstalk/shared").ChatRoom | null} room
 * @param {import("@crosstalk/shared").ChatMessage} message
 * @returns {import("@crosstalk/shared").ChatRoom | null}
 */
export function applyIncomingMessage(room, message) {
  if (!room || room.id !== message.roomId || room.messages.some((item) => item.id === message.id)) return room;
  return { ...room, messages: [...room.messages, message] };
}
