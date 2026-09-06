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
import type { ChatMessage, FloatingReaction } from "@/types";

export type { ChatMessage, FloatingReaction };

export function useRoomEvents({ slug }: { slug: string }) {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, number>>({});
  const timers = useRef<number[]>([]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) =>
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
  }, [room, appendMessage, showReaction]);

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
      raisedAt: raised ? Date.now() : null,
    });
  }, [publish, handRaised, localIdentity]);

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
