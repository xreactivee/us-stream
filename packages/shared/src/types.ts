import type { z } from "zod";
import type { DOC_KINDS, LOCALES, REACTION_EMOJIS } from "./constants";
import type {
  chatMessageEvent,
  DATA_TOPICS,
  dataChannelEvent,
  handEvent,
  reactionEvent,
} from "./events";
import type { ROLES } from "./roles";
import type {
  admitParticipantSchema,
  askQuestionSchema,
  createPollSchema,
  createRoomSchema,
  joinRoomResponseSchema,
  joinRoomSchema,
  moderateRoomSchema,
  scheduleMeetingSchema,
  updatePreferencesSchema,
  updateRoomSchema,
  votePollSchema,
} from "./schemas";
import type { BOARD_COLORS, BOARD_SHAPE_KINDS, BOARD_TOOLS } from "./whiteboard";

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
export type DocKind = (typeof DOC_KINDS)[number];
export type Locale = (typeof LOCALES)[number];

export type DataTopic = (typeof DATA_TOPICS)[number];
export type DataChannelEvent = z.infer<typeof dataChannelEvent>;
export type ChatMessageEvent = z.infer<typeof chatMessageEvent>;
export type ReactionEvent = z.infer<typeof reactionEvent>;
export type HandEvent = z.infer<typeof handEvent>;

export type Role = (typeof ROLES)[number];

export interface RoomPermissions {
  canPublish: boolean;
  canShareScreen: boolean;
  canPublishData: boolean;
  canSubscribe: boolean;
  canManageParticipants: boolean;
  canManageRoom: boolean;
  canManagePolls: boolean;
  canEditDocuments: boolean;
}

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
export type ModerateRoomInput = z.infer<typeof moderateRoomSchema>;
export type AdmitParticipantInput = z.infer<typeof admitParticipantSchema>;
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type VotePollInput = z.infer<typeof votePollSchema>;
export type AskQuestionInput = z.infer<typeof askQuestionSchema>;
export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

export type BoardTool = (typeof BOARD_TOOLS)[number];
export type BoardShapeKind = (typeof BOARD_SHAPE_KINDS)[number];
export type BoardColor = (typeof BOARD_COLORS)[number];

export interface BoardShape {
  id: string;
  kind: BoardShapeKind;
  color: string;
  width: number;
  points: number[];
  text?: string;
  author: string;
  createdAt: number;
}
