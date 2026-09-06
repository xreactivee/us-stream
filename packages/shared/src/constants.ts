export const ROOM_NAME_MIN_LENGTH = 1;
export const ROOM_NAME_MAX_LENGTH = 80;

export const ROOM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){1,4}$/;
export const ROOM_SLUG_MAX_LENGTH = 48;

export const ROOM_PASSWORD_MIN_LENGTH = 4;
export const ROOM_PASSWORD_MAX_LENGTH = 64;

export const DEFAULT_MAX_PARTICIPANTS = 16;
export const HARD_MAX_PARTICIPANTS = 50;

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 40;

export const LIVEKIT_TOKEN_TTL_SECONDS = 60 * 60 * 6;

export const GUEST_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export const CHAT_MESSAGE_MAX_LENGTH = 2000;
export const CHAT_HISTORY_PAGE_SIZE = 50;
export const TYPING_INDICATOR_TIMEOUT_MS = 3000;

export const REACTION_EMOJIS = ["👍", "👏", "🎉", "❤️", "😂", "😮", "🤔", "👋"] as const;
export const REACTION_LIFETIME_MS = 4000;

export const POLL_QUESTION_MAX_LENGTH = 300;
export const POLL_OPTION_MAX_LENGTH = 120;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 8;

export const QUESTION_MAX_LENGTH = 500;

export const DOC_KINDS = ["whiteboard", "notes"] as const;

export const DOC_SNAPSHOT_INTERVAL_MS = 10_000;

export const LOCALES = ["tr", "en"] as const;
export const DEFAULT_LOCALE = "en";
export const TURKISH_COUNTRY_CODE = "TR";
export const LOCALE_COOKIE_NAME = "us-stream-locale";
