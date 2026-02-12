export interface RhymeSet {
  perfect: string[];
  near: string[];
  family: string[];
}

export interface RhymeData {
  dictionary: Record<string, RhymeSet>;
  endings: Array<{ key: string; words: string[] }>;
  wordBank: string[];
}

export interface RhymeResults {
  perfect: string[];
  near: string[];
  family: string[];
}

export const EMPTY_RHYMES: RhymeResults = {
  perfect: [],
  near: [],
  family: [],
};

const WORD_PATTERN = /[a-z']/i;

function dedupe(words: string[], exclude?: string): string[] {
  const cleaned = words
    .map((word) => sanitizeWord(word))
    .filter(Boolean)
    .filter((word) => (exclude ? word !== exclude : true));
  return Array.from(new Set(cleaned));
}

export function sanitizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "").trim();
}

export function extractWordAtCursor(text: string, cursor: number): string {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));

  let start = safeCursor;
  while (start > 0 && WORD_PATTERN.test(text[start - 1])) {
    start -= 1;
  }

  let end = safeCursor;
  while (end < text.length && WORD_PATTERN.test(text[end])) {
    end += 1;
  }

  return sanitizeWord(text.slice(start, end));
}

function getSuffixMatches(
  word: string,
  endings: Array<{ key: string; words: string[] }>,
): string[] {
  const ranked = endings
    .map((group) => {
      const key = sanitizeWord(group.key);
      if (!key) return null;
      if (word.endsWith(key)) {
        return { score: key.length + 2, words: group.words };
      }
      if (group.words.some((entry) => sanitizeWord(entry) === word)) {
        return { score: key.length + 1, words: group.words };
      }
      if (key.length >= 3 && word.slice(-3) === key.slice(-3)) {
        return { score: 1, words: group.words };
      }
      return null;
    })
    .filter((value): value is { score: number; words: string[] } => Boolean(value))
    .sort((a, b) => b.score - a.score);

  const collected = ranked.flatMap((match) => match.words);
  return dedupe(collected, word);
}

export function getRhymes(word: string, data: RhymeData | null, limit = 18): RhymeResults {
  const cleanWord = sanitizeWord(word);
  if (!cleanWord || !data) {
    return EMPTY_RHYMES;
  }

  const direct = data.dictionary[cleanWord];
  if (direct) {
    return {
      perfect: dedupe(direct.perfect, cleanWord).slice(0, limit),
      near: dedupe(direct.near, cleanWord).slice(0, limit),
      family: dedupe(direct.family, cleanWord).slice(0, limit),
    };
  }

  const suffixMatches = getSuffixMatches(cleanWord, data.endings);
  const perfect = suffixMatches.slice(0, limit);
  const near = suffixMatches
    .slice(Math.min(limit, 6))
    .concat(data.wordBank.filter((entry) => entry.includes(cleanWord.slice(-2))))
    .slice(0, limit);
  const family = data.wordBank
    .filter((entry) => entry.startsWith(cleanWord[0] ?? ""))
    .slice(0, limit);

  return {
    perfect: dedupe(perfect, cleanWord),
    near: dedupe(near, cleanWord),
    family: dedupe(family, cleanWord),
  };
}

export function searchRhymeWords(
  query: string,
  data: RhymeData | null,
  limit = 120,
): string[] {
  const cleanQuery = sanitizeWord(query);
  if (!cleanQuery || !data) return [];

  const base = Array.from(
    new Set([...Object.keys(data.dictionary), ...data.wordBank.map((word) => sanitizeWord(word))]),
  );

  return base
    .filter((word) => word.includes(cleanQuery))
    .sort((a, b) => {
      const aStarts = a.startsWith(cleanQuery) ? 0 : 1;
      const bStarts = b.startsWith(cleanQuery) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    })
    .slice(0, limit);
}
