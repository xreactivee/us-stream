"use client";

import { useRoomContext } from "@livekit/components-react";
import {
  type DataChannelEvent,
  decodeEvent,
  encodeEvent,
  REACTION_LIFETIME_MS,
  type ReactionEmoji,
  topicFor,
} from "@us-stream/shared";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  senderIdentity: string;
  senderName: string;
  body: string;
  /** Set when the message was sent to one person rather than the room. */
  toIdentity: string | null;
  sentAt: number;
}

export interface FloatingReaction {
  id: string;
  emoji: ReactionEmoji;
  senderName: string;
}

/** `room_<id>--breakout-3` reads to a participant as simply "3". */
function labelOfBreakout(roomName: string): string | null {
  const marker = roomName.lastIndexOf("--breakout-");

  return marker > 0 ? roomName.slice(marker + "--breakout-".length) : null;
}

/**
 * Everything that is not audio or video.
 *
 * Chat, reactions and raised hands travel over LiveKit's data channel, so they
 * arrive as fast as the media does and need no server in the path. Chat is
 * additionally written to our own API by the sender, because the data channel
 * delivers to whoever is connected right now and nothing else — a message has
 * to outlive the meeting to be worth reading afterwards.
 */
export function useRoomEvents({
  slug,
  onBreakoutMove,
}: {
  slug: string;
  /**
   * Called when the server sends this participant to another room, or brings
   * them back. Reconnecting is the caller's job because it means replacing the
   * token the whole call is built on.
   */
  onBreakoutMove: (move: { token: string; label: string | null; closesAt: number | null }) => void;
}) {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, number>>({});
  const timers = useRef<number[]>([]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) =>
      // The sender sees its own message immediately and then receives nothing
      // back, but a reconnect can replay history; the id keeps it to one.
      current.some((existing) => existing.id === message.id) ? current : [...current, message],
    );
  }, []);

  const showReaction = useCallback((reaction: FloatingReaction) => {
    setReactions((current) => [...current, reaction]);

    const timer = window.setTimeout(() => {
      setReactions((current) => current.filter((entry) => entry.id !== reaction.id));
    }, REACTION_LIFETIME_MS);

    timers.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      for (const timer of timers.current) {
        clearTimeout(timer);
      }
    },
    [],
  );

  // Backfill from storage, so someone joining halfway through can read what
  // was said before they arrived.
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      const response = await fetch(`/api/rooms/${slug}/messages`).catch(() => null);
      const payload = (await response?.json().catch(() => null)) as {
        messages?: ChatMessage[];
      } | null;

      if (!cancelled && payload?.messages) {
        setMessages(payload.messages);
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    function handleData(payload: Uint8Array, participant?: { identity: string; name?: string }) {
      const event = decodeEvent(payload);

      if (!event || !participant) {
        return;
      }

      switch (event.type) {
        case "chat.message":
          appendMessage({
            id: event.id,
            // Sender identity comes from LiveKit, not from the payload: the
            // SFU knows who published the frame, the frame's own claim about
            // itself is only a claim.
            senderIdentity: participant.identity,
            senderName: participant.name || participant.identity,
            body: event.body,
            toIdentity: event.toIdentity ?? null,
            sentAt: event.sentAt,
          });
          break;

        case "presence.reaction":
          showReaction({
            id: `${participant.identity}-${event.sentAt}`,
            emoji: event.emoji,
            senderName: participant.name || participant.identity,
          });
          break;

        case "breakout.move":
          onBreakoutMove({
            token: event.token,
            label: labelOfBreakout(event.roomName),
            closesAt: event.closesAt,
          });
          break;

        case "breakout.recall":
          onBreakoutMove({ token: event.token, label: null, closesAt: null });
          break;

        case "breakout.broadcast":
          // A message from the host reaches every sub-room; it belongs in the
          // conversation, marked as not coming from a participant.
          appendMessage({
            id: `broadcast-${event.sentAt}`,
            senderIdentity: "system",
            senderName: participant.name || participant.identity,
            body: event.body,
            toIdentity: null,
            sentAt: event.sentAt,
          });
          break;

        case "presence.hand":
          setRaisedHands((current) => {
            const next = { ...current };

            if (event.raised) {
              next[participant.identity] = event.raisedAt ?? Date.now();
            } else {
              delete next[participant.identity];
            }

            return next;
          });
          break;

        default:
          break;
      }
    }

    room.on(RoomEvent.DataReceived, handleData);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [room, appendMessage, showReaction, onBreakoutMove]);

  // Someone who leaves cannot still have their hand up.
  useEffect(() => {
    function handleDisconnect(participant: { identity: string }) {
      setRaisedHands((current) => {
        if (!(participant.identity in current)) {
          return current;
        }

        const next = { ...current };
        delete next[participant.identity];
        return next;
      });
    }

    room.on(RoomEvent.ParticipantDisconnected, handleDisconnect);

    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleDisconnect);
    };
  }, [room]);

  const publish = useCallback(
    async (event: DataChannelEvent, destinationIdentities?: string[]) => {
      await room.localParticipant.publishData(encodeEvent(event), {
        reliable: true,
        topic: topicFor(event),
        destinationIdentities,
      });
    },
    [room],
  );

  const sendMessage = useCallback(
    async (body: string, toIdentity?: string | null) => {
      const event = {
        type: "chat.message",
        id: crypto.randomUUID(),
        body,
        toIdentity: toIdentity ?? null,
        sentAt: Date.now(),
      } as const;

      appendMessage({
        id: event.id,
        senderIdentity: room.localParticipant.identity,
        senderName: room.localParticipant.name || room.localParticipant.identity,
        body,
        toIdentity: event.toIdentity,
        sentAt: event.sentAt,
      });

      await publish(event, toIdentity ? [toIdentity] : undefined);

      // Storage is best-effort: a failed write loses the message from the
      // history, not from the conversation happening right now.
      void fetch(`/api/rooms/${slug}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => undefined);
    },
    [publish, room.localParticipant, slug, appendMessage],
  );

  const sendReaction = useCallback(
    async (emoji: ReactionEmoji) => {
      const sentAt = Date.now();

      showReaction({
        id: `${room.localParticipant.identity}-${sentAt}`,
        emoji,
        senderName: room.localParticipant.name || room.localParticipant.identity,
      });

      await publish({ type: "presence.reaction", emoji, sentAt });
    },
    [publish, room.localParticipant, showReaction],
  );

  const localIdentity = room.localParticipant.identity;
  const handRaised = localIdentity in raisedHands;

  const toggleHand = useCallback(async () => {
    const raised = !handRaised;

    setRaisedHands((current) => {
      const next = { ...current };

      if (raised) {
        next[localIdentity] = Date.now();
      } else {
        delete next[localIdentity];
      }

      return next;
    });

    await publish({
      type: "presence.hand",
      raised,
      // Everyone orders the queue by this, so it has to come from the raiser.
      raisedAt: raised ? Date.now() : null,
    });
  }, [publish, handRaised, localIdentity]);

  /** Oldest hand first — the queue people expect when they raise one. */
  const handQueue = Object.entries(raisedHands)
    .sort(([, a], [, b]) => a - b)
    .map(([identity]) => identity);

  return {
    messages,
    reactions,
    handQueue,
    handRaised,
    sendMessage,
    sendReaction,
    toggleHand,
  };
}
