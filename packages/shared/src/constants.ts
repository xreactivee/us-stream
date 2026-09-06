/** Limits and formats shared by the web app and the realtime service. */

// ------------------------------------------------------------------- rooms --

export const ROOM_NAME_MIN_LENGTH = 1;
export const ROOM_NAME_MAX_LENGTH = 80;

/** Human-readable invite slugs, e.g. `mavi-kedi-4821`. */
export const ROOM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){1,4}$/;
export const ROOM_SLUG_MAX_LENGTH = 48;

export const ROOM_PASSWORD_MIN_LENGTH = 4;
export const ROOM_PASSWORD_MAX_LENGTH = 64;

export const DEFAULT_MAX_PARTICIPANTS = 16;
/** A single SFU node comfortably handles far more, but this product targets small groups. */
export const HARD_MAX_PARTICIPANTS = 50;

// ------------------------------------------------------------ participants --

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 40;

/** LiveKit access tokens are short-lived; the client reconnects with a fresh one. */
export const LIVEKIT_TOKEN_TTL_SECONDS = 60 * 60 * 6;

/** Guest identities are signed for a single meeting and expire quickly. */
export const GUEST_TOKEN_TTL_SECONDS = 60 * 60 * 12;

// -------------------------------------------------------------------- chat --

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
/** Messages older than this are not loaded into the in-call chat panel. */
export const CHAT_HISTORY_PAGE_SIZE = 50;
export const TYPING_INDICATOR_TIMEOUT_MS = 3000;

// --------------------------------------------------------------- reactions --

export const REACTION_EMOJIS = ["👍", "👏", "🎉", "❤️", "😂", "😮", "🤔", "👋"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
/** How long a floating reaction stays on screen. */
export const REACTION_LIFETIME_MS = 4000;

// ------------------------------------------------------------------- polls --

export const POLL_QUESTION_MAX_LENGTH = 300;
export const POLL_OPTION_MAX_LENGTH = 120;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 8;

export const QUESTION_MAX_LENGTH = 500;

// -------------------------------------------------------------- documents --

export const DOC_KINDS = ["whiteboard", "notes"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

/** How often the realtime service snapshots a Yjs document to Postgres. */
export const DOC_SNAPSHOT_INTERVAL_MS = 10_000;

// --------------------------------------------------------------- i18n ------

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Visitors resolving to this country get Turkish unless they chose otherwise. */
export const TURKISH_COUNTRY_CODE = "TR";
export const LOCALE_COOKIE_NAME = "us-stream-locale";
