const BLOCKED_TERMS = [
  "cp",
  "child porn",
  "childporn", 
  "pedo",
  "pedophile",
  "pedophilia",
  "underage",
  "minor sex",
  "kid sex",
  "child sex",
  "loli",
  "shota",
  "preteen",
  "jailbait",
  "csam",
  "child abuse",
  "molest child",
  "molest kid",
];

const BLOCKED_PATTERNS = [
  /\b\d+\s*y\.?o\.?\s*(boy|girl|kid|child)/i,
  /\b(sex|fuck|rape)\s*(with|a|the)?\s*(child|kid|minor|underage|preteen)/i,
  /(child|kid|minor|underage|preteen)\s*(sex|fuck|rape)/i,
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[0-9]/g, (d) => {
      const leetMap: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b' };
      return leetMap[d] || d;
    })
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWordSet(text: string): Set<string> {
  return new Set(text.split(' ').filter(w => w.length > 0));
}

export function calculateSimilarity(text1: string, text2: string): number {
  const set1 = getWordSet(text1);
  const set2 = getWordSet(text2);
  
  if (set1.size === 0 || set2.size === 0) return 0;
  
  let intersection = 0;
  for (const word of set1) {
    if (set2.has(word)) intersection++;
  }
  
  const union = set1.size + set2.size - intersection;
  return Math.round((intersection / union) * 100);
}

export interface ModerationResult {
  blocked: boolean;
  flagged: boolean;
  reason?: string;
  matchedPhraseId?: string;
  similarityScore?: number;
}

export interface FlaggedPhraseRule {
  id: string;
  phrase: string;
  normalizedPhrase: string;
  severity: string;
  similarityThreshold: number;
}

export function analyzeContent(
  text: string, 
  flaggedPhrases: FlaggedPhraseRule[]
): ModerationResult {
  const lowerText = text.toLowerCase();
  
  for (const term of BLOCKED_TERMS) {
    if (lowerText.includes(term.toLowerCase())) {
      return { 
        blocked: true, 
        flagged: false,
        reason: "Content contains prohibited terms related to child exploitation" 
      };
    }
  }
  
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        blocked: true, 
        flagged: false,
        reason: "Content contains prohibited patterns related to child exploitation" 
      };
    }
  }
  
  const normalizedContent = normalizeText(text);
  
  for (const rule of flaggedPhrases) {
    if (!rule.normalizedPhrase) continue;
    
    const similarity = calculateSimilarity(normalizedContent, rule.normalizedPhrase);
    
    if (similarity >= rule.similarityThreshold) {
      if (rule.severity === 'block') {
        return {
          blocked: true,
          flagged: false,
          reason: `Content matches blocked phrase: "${rule.phrase}"`,
          matchedPhraseId: rule.id,
          similarityScore: similarity,
        };
      } else {
        return {
          blocked: false,
          flagged: true,
          reason: `Content matches flagged phrase: "${rule.phrase}"`,
          matchedPhraseId: rule.id,
          similarityScore: similarity,
        };
      }
    }
  }
  
  return { blocked: false, flagged: false };
}

export function containsProhibitedContent(text: string): { blocked: boolean; reason?: string } {
  const result = analyzeContent(text, []);
  return { blocked: result.blocked, reason: result.reason };
}
