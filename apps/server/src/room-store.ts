import type { ChatMessage, ChatRoom, Language, RoomParticipant } from "@crosstalk/shared";

export type JoinResult =
  | { ok: true; room: ChatRoom; participant: RoomParticipant }
  | { ok: false; code: "ROOM_FULL"; message: string };

export class RoomStore {
  private readonly rooms = new Map<string, ChatRoom>();

  get(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  join(roomId: string, participant: RoomParticipant): JoinResult {
    const room = this.rooms.get(roomId) ?? { id: roomId, participants: [], messages: [] };
    const existing = room.participants.find((entry) => entry.id === participant.id);

    if (!existing && room.participants.length >= 2) {
      return { ok: false, code: "ROOM_FULL", message: "This room already has two participants." };
    }

    if (existing) {
      existing.displayName = participant.displayName;
      existing.language = participant.language;
    } else {
      room.participants.push(participant);
    }

    this.rooms.set(roomId, room);
    return { ok: true, room, participant: existing ?? participant };
  }

  setLanguage(roomId: string, participantId: string, language: Language): ChatRoom | undefined {
    const room = this.rooms.get(roomId);
    const participant = room?.participants.find((entry) => entry.id === participantId);
    if (!room || !participant) return undefined;
    participant.language = language;
    return room;
  }

  appendMessage(roomId: string, message: ChatMessage): ChatRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.messages.push(message);
    return room;
  }

  leave(roomId: string, participantId: string): ChatRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.participants = room.participants.filter((entry) => entry.id !== participantId);
    if (room.participants.length === 0 && room.messages.length === 0) {
      this.rooms.delete(roomId);
      return undefined;
    }
    return room;
  }
}
