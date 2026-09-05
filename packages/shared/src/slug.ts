/**
 * Room slugs.
 *
 * An invite code is read aloud, typed from memory and pasted into chat, so it
 * is built from two ordinary words and a number rather than random characters.
 * The words come from the creator's language: a Turkish user gets
 * `mavi-kedi-4821`, an English one `blue-cat-4821`.
 *
 * The lists avoid words that look alike when typed quickly and anything that
 * could read as unpleasant when two of them land next to each other.
 */

import { DEFAULT_LOCALE, type Locale } from "./constants";

const WORDS: Record<Locale, { adjectives: readonly string[]; nouns: readonly string[] }> = {
  tr: {
    adjectives: [
      "mavi",
      "yesil",
      "sari",
      "mor",
      "turuncu",
      "beyaz",
      "siyah",
      "gri",
      "hizli",
      "sakin",
      "kucuk",
      "buyuk",
      "parlak",
      "derin",
      "genis",
      "sicak",
      "serin",
      "tatli",
      "gizli",
      "uzak",
      "yakin",
      "yumusak",
      "keskin",
      "canli",
    ],
    nouns: [
      "kedi",
      "kopek",
      "kus",
      "balik",
      "tilki",
      "kaplan",
      "ayi",
      "kurt",
      "dag",
      "deniz",
      "orman",
      "nehir",
      "bulut",
      "yildiz",
      "kule",
      "kopru",
      "kahve",
      "kitap",
      "anahtar",
      "pencere",
      "bahce",
      "ada",
      "yol",
      "cadir",
    ],
  },
  en: {
    adjectives: [
      "blue",
      "green",
      "amber",
      "violet",
      "orange",
      "white",
      "black",
      "grey",
      "swift",
      "calm",
      "small",
      "grand",
      "bright",
      "deep",
      "wide",
      "warm",
      "cool",
      "sweet",
      "hidden",
      "distant",
      "near",
      "soft",
      "sharp",
      "lively",
    ],
    nouns: [
      "cat",
      "dog",
      "bird",
      "fish",
      "fox",
      "tiger",
      "bear",
      "wolf",
      "hill",
      "ocean",
      "forest",
      "river",
      "cloud",
      "star",
      "tower",
      "bridge",
      "coffee",
      "book",
      "key",
      "window",
      "garden",
      "island",
      "road",
      "tent",
    ],
  },
};

function pick<T>(list: readonly T[]): T {
  const index = Math.floor(Math.random() * list.length);
  // `noUncheckedIndexedAccess` cannot see that the index is in range.
  return list[index] as T;
}

/**
 * Generates a candidate slug. Collisions are possible — roughly one in 5.7
 * million — so the caller must still check uniqueness and retry.
 */
export function generateRoomSlug(locale: Locale = DEFAULT_LOCALE): string {
  const words = WORDS[locale] ?? WORDS[DEFAULT_LOCALE];
  const number = 1000 + Math.floor(Math.random() * 9000);

  return `${pick(words.adjectives)}-${pick(words.nouns)}-${number}`;
}
