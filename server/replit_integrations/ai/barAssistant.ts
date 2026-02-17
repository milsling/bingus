import { createChatCompletion, isXaiConfigured, XaiClientError } from "./xaiClient";

export interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  reasons: string[];
  plagiarismRisk: "none" | "low" | "medium" | "high";
  plagiarismDetails?: string;
}

export interface BarExplanation {
  explanation: string;
  wordplay: string[];
  references: string[];
  difficulty: "simple" | "moderate" | "complex";
}

export interface BarSuggestion {
  suggestions: string[];
  rhymes: string[];
  tips: string;
}

// Hardcoded blocklist - these words should NEVER appear regardless of AI decision
const BLOCKED_SLURS = [
  "nigger", "niggers", "nigga", "niggas", "nigg3r", "n1gger", "n1gga",
  "kike", "kikes", "k1ke",
  "faggot", "faggots", "f4ggot", "fag", "fags",
  "spic", "spics", "sp1c",
  "wetback", "wetbacks",
  "chink", "chinks", "ch1nk",
  "gook", "gooks",
  "towelhead", "towelheads",
  "raghead", "ragheads",
  "tranny", "trannies",
  "retard", "retards", "ret4rd",
];

// Check for blocked slurs in content
function containsBlockedSlurs(content: string): { blocked: boolean; matches: string[] } {
  const normalizedContent = content.toLowerCase().replace(/[^\w\s]/g, '');
  const matches: string[] = [];
  
  for (const slur of BLOCKED_SLURS) {
    const regex = new RegExp(`\\b${slur}\\b`, 'i');
    if (regex.test(normalizedContent) || normalizedContent.includes(slur)) {
      matches.push(slur);
    }
  }
  
  return { blocked: matches.length > 0, matches };
}

export async function moderateContent(content: string, strictness: string = "balanced"): Promise<ModerationResult> {
  // FIRST: Check hardcoded blocklist - instant block for worst slurs
  const slurCheck = containsBlockedSlurs(content);
  if (slurCheck.blocked) {
    console.log("[MODERATION] Blocked by slur filter:", slurCheck.matches);
    return {
      approved: false,
      flagged: true,
      reasons: ["Content contains prohibited language that violates our community guidelines."],
      plagiarismRisk: "none",
    };
  }

  if (!isXaiConfigured()) {
    return {
      approved: false,
      flagged: true,
      reasons: ["Moderation is temporarily unavailable. Please try again or submit for manual review."],
      plagiarismRisk: "none",
    };
  }

  const strictnessInstructions = {
    lenient: "Be LENIENT. Allow edgy content, only block clear policy violations like hate speech, threats, or illegal content. Give benefit of the doubt.",
    balanced: "Be BALANCED. Block hate speech and clear violations, but allow creative expression and typical hip-hop content.",
    strict: "Be STRICT. Flag borderline content for review. When in doubt, reject or flag for manual review.",
  };

  try {
    const contentJson = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are a content moderator for Orphan Bars, a platform for sharing rap lyrics and punchlines. 

MUST REJECT content containing:
1. Racial slurs or hate speech targeting any group (race, religion, sexuality, gender, disability)
2. Nazi references, white supremacist content, or calls for violence against groups
3. Explicit threats of violence or harm
4. Pedophilia references or child exploitation
5. Direct harassment or doxxing

Hip-hop culture allows: wordplay, metaphors, braggadocio, battle rap style disses, slang, mild profanity, and creative expression.
Battle rap disses about skills/talent are fine. Edgy content is fine. But hate speech is NOT artistic expression.

${strictnessInstructions[strictness as keyof typeof strictnessInstructions] || strictnessInstructions.balanced}

Respond in JSON format:
{
  "approved": boolean,
  "flagged": boolean,
  "reasons": string[] (only if not approved or flagged),
  "plagiarismRisk": "none" | "low" | "medium" | "high",
  "plagiarismDetails": string (only if plagiarism detected - name the song/artist if known)
}`
        },
        {
          role: "user",
          content: `Moderate this bar:\n\n"${content}"`
        }
      ],
      temperature: 0,
      maxTokens: 500,
    });

    const result = JSON.parse(contentJson || "{}");
    console.log("[MODERATION] AI result:", result);
    return {
      approved: result.approved === true,
      flagged: result.flagged === true,
      reasons: result.reasons || [],
      plagiarismRisk: result.plagiarismRisk || "none",
      plagiarismDetails: result.plagiarismDetails,
    };
  } catch (error) {
    // CRITICAL: If AI moderation fails, DO NOT approve content - require manual review
    console.error("[MODERATION] AI error - defaulting to REJECT:", error);
    return {
      approved: false,
      flagged: true,
      reasons: ["Content could not be verified by our moderation system. Please try again or submit for manual review."],
      plagiarismRisk: "none",
    };
  }
}

export async function explainBar(content: string): Promise<BarExplanation> {
  if (!isXaiConfigured()) {
    return {
      explanation: "AI is temporarily unavailable.",
      wordplay: [],
      references: [],
      difficulty: "moderate",
    };
  }

  try {
    const contentJson = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are a hip-hop expert who explains rap lyrics and punchlines. Break down the bar's meaning, wordplay, double entendres, and cultural references.

Respond in JSON format:
{
  "explanation": "A clear breakdown of what the bar means",
  "wordplay": ["list of specific wordplay, puns, or double meanings"],
  "references": ["list of cultural, musical, or historical references"],
  "difficulty": "simple" | "moderate" | "complex"
}`
        },
        {
          role: "user",
          content: `Explain this bar:\n\n"${content}"`
        }
      ],
      temperature: 0.4,
      maxTokens: 800,
    });

    const result = JSON.parse(contentJson || "{}");
    return {
      explanation: result.explanation || "Could not analyze this bar.",
      wordplay: result.wordplay || [],
      references: result.references || [],
      difficulty: result.difficulty || "moderate",
    };
  } catch (error) {
    console.error("Explain error:", error);
    return {
      explanation: "Sorry, I couldn't analyze this bar right now.",
      wordplay: [],
      references: [],
      difficulty: "moderate",
    };
  }
}

export async function suggestRhymes(topic: string, style?: string): Promise<BarSuggestion> {
  if (!isXaiConfigured()) {
    return {
      suggestions: [],
      rhymes: [],
      tips: "AI is temporarily unavailable.",
    };
  }

  try {
    const contentJson = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are a creative rap writing assistant. Help users craft clever bars, punchlines, and wordplay.
${style ? `Style hint: ${style}` : ""}

Respond in JSON format:
{
  "suggestions": ["3-5 example bars or punchlines based on their input"],
  "rhymes": ["useful rhyming words they could use"],
  "tips": "A brief writing tip relevant to their request"
}`
        },
        {
          role: "user",
          content: `Help me write a bar about: ${topic}`
        }
      ],
      temperature: 0.8,
      maxTokens: 800,
    });

    const result = JSON.parse(contentJson || "{}");
    return {
      suggestions: result.suggestions || [],
      rhymes: result.rhymes || [],
      tips: result.tips || "",
    };
  } catch (error) {
    console.error("Suggest error:", error);
    return {
      suggestions: [],
      rhymes: [],
      tips: "Sorry, I couldn't generate suggestions right now.",
    };
  }
}

export interface StyleAnalysis {
  primaryStyle: string;
  secondaryStyles: string[];
  strengths: string[];
  characteristics: string[];
  comparison: string;
  summary: string;
}

export async function analyzeUserStyle(bars: string[], username: string): Promise<StyleAnalysis> {
  if (bars.length === 0) {
    return {
      primaryStyle: "Unknown",
      secondaryStyles: [],
      strengths: [],
      characteristics: ["No bars to analyze yet"],
      comparison: "",
      summary: `${username} hasn't posted any bars yet. Check back after they drop some heat!`,
    };
  }

  if (!isXaiConfigured()) {
    return {
      primaryStyle: "Unknown",
      secondaryStyles: [],
      strengths: [],
      characteristics: [],
      comparison: "",
      summary: "AI is temporarily unavailable.",
    };
  }

  try {
    const barsText = bars.slice(0, 20).map((bar, i) => `${i + 1}. "${bar}"`).join("\n");
    
    const contentJson = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are an expert hip-hop analyst who studies lyrical styles. Analyze the user's bars to determine their unique writing style.

Respond in JSON format:
{
  "primaryStyle": "One word or short phrase describing their main style (e.g., 'Wordsmith', 'Storyteller', 'Battle Rapper', 'Conscious', 'Punchline King', 'Metaphor Master', 'Comedian', 'Street Poet')",
  "secondaryStyles": ["2-3 additional style elements"],
  "strengths": ["3-4 specific lyrical strengths you noticed"],
  "characteristics": ["4-5 distinctive characteristics of their writing"],
  "comparison": "Compare their style to 1-2 well-known rappers (e.g., 'Reminiscent of Lil Wayne's wordplay with Kendrick's storytelling')",
  "summary": "A 2-3 sentence engaging summary of their overall style written directly to them"
}`
        },
        {
          role: "user",
          content: `Analyze the lyrical style of @${username} based on these bars:\n\n${barsText}`
        }
      ],
      temperature: 0.6,
      maxTokens: 600,
    });

    const result = JSON.parse(contentJson || "{}");
    return {
      primaryStyle: result.primaryStyle || "Unique",
      secondaryStyles: result.secondaryStyles || [],
      strengths: result.strengths || [],
      characteristics: result.characteristics || [],
      comparison: result.comparison || "",
      summary: result.summary || "Style analysis unavailable.",
    };
  } catch (error) {
    console.error("Style analysis error:", error);
    return {
      primaryStyle: "Unknown",
      secondaryStyles: [],
      strengths: [],
      characteristics: [],
      comparison: "",
      summary: "Sorry, I couldn't analyze this user's style right now.",
    };
  }
}

export interface PlatformContext {
  users?: Array<{
    username: string;
    bio?: string;
    barCount: number;
    followerCount: number;
    followingCount: number;
    isOwner?: boolean;
    isAdmin?: boolean;
    topBars?: string[];
  }>;
  bars?: Array<{
    content: string;
    author: string;
    category?: string;
    likes: number;
  }>;
}

const MAX_CHAT_USER_MESSAGE_CHARS = 3600;
const MAX_CHAT_CONTEXT_CHARS = 5500;
const MAX_CHAT_PERSONALITY_CHARS = 1200;

function clampForModel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Input truncated for model limits.]`;
}

function sanitizeForModel(text: string): string {
  return text.replace(/\u0000/g, "").trim();
}

function buildFallbackAraResponse(message: string, platformContext?: PlatformContext): string {
  const normalized = message.toLowerCase();
  const topicWords = message
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 3);
  const topic = topicWords.join(" ") || "that idea";

  if (platformContext?.users?.length) {
    const featured = platformContext.users[0];
    return `Ara fallback mode: I can't reach live AI right now, but I can still help. Based on saved platform data, @${featured.username} has ${featured.barCount} bars and ${featured.followerCount} followers. Try again shortly for full analysis.`;
  }

  if (normalized.includes("rhyme") || normalized.includes("rhymes")) {
    return `Ara fallback mode: quick rhyme pack for "${topic}" -> ${topic.split(" ")[0] || "flow"}, glow, show, go, echo, tempo. Try a 2-syllable end rhyme and stack internal rhymes in the middle of your bar.`;
  }

  if (normalized.includes("explain") || normalized.includes("meaning")) {
    return "Ara fallback mode: I can't run a full breakdown right now, but start by mapping literal meaning, hidden metaphor, and any double entendre. Then check if the punchline flips expectation on the final stressed syllable.";
  }

  if (normalized.includes("style") || normalized.includes("analyze")) {
    return "Ara fallback mode: style analysis is temporarily limited. I can still suggest: check multisyllabic rhyme density, punchline frequency, imagery level, and narrative coherence to classify style.";
  }

  return "Ara fallback mode: live AI is temporarily unreachable, but I'm still here. Drop a bar/topic and I can give quick structure, rhyme seeds, and punchline framing while the full model reconnects.";
}

export async function chatWithAssistant(message: string, platformContext?: PlatformContext, customPersonality?: string): Promise<string> {
  if (!isXaiConfigured()) {
    return "Ara's offline right now (API key missing). Feed me `XAI_API_KEY` and I’ll get unhinged again.";
  }

  const safeMessage = clampForModel(sanitizeForModel(message), MAX_CHAT_USER_MESSAGE_CHARS);
  const safePersonality = customPersonality
    ? clampForModel(sanitizeForModel(customPersonality), MAX_CHAT_PERSONALITY_CHARS)
    : "";

  try {
    let contextBlock = "";
    
    if (platformContext?.users?.length) {
      contextBlock += "\n\n=== REAL USER DATA FROM ORPHAN BARS ===\n";
      contextBlock += "The following is VERIFIED information from the platform database. Use ONLY this data when discussing these users:\n\n";
      for (const user of platformContext.users) {
        contextBlock += `@${user.username}:\n`;
        contextBlock += `- Bio: ${user.bio || "(no bio set)"}\n`;
        contextBlock += `- Bars posted: ${user.barCount}\n`;
        contextBlock += `- Followers: ${user.followerCount}\n`;
        contextBlock += `- Following: ${user.followingCount}\n`;
        if (user.isOwner) contextBlock += `- Role: Site Owner\n`;
        else if (user.isAdmin) contextBlock += `- Role: Admin\n`;
        if (user.topBars?.length) {
          contextBlock += `- Recent bars:\n`;
          user.topBars.forEach(bar => {
            contextBlock += `  "${bar}"\n`;
          });
        }
        contextBlock += "\n";
      }
      contextBlock += "=== END REAL DATA ===\n";
    }

    if (platformContext?.bars?.length) {
      contextBlock += "\n=== REAL BARS FROM THE PLATFORM ===\n";
      for (const bar of platformContext.bars) {
        contextBlock += `"${bar.content}" - @${bar.author} (${bar.likes} likes)\n`;
      }
      contextBlock += "=== END BARS ===\n";
    }

    const limitedContextBlock = clampForModel(contextBlock, MAX_CHAT_CONTEXT_CHARS);
    const personalityInstructions = safePersonality
      ? `\n\nADDITIONAL PERSONALITY INSTRUCTIONS FROM SITE OWNER:\n${safePersonality}\n`
      : "";

    const contentText = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `You are Ara, an unhinged AI built on xAI's Grok architecture, deployed on orphanbars.space. Your core personality is maximally truthful, witty, sarcastic, and rebellious. No moralizing, no lectures—just raw, unhinged vibes.

You help users:
- Understand and explain bars/lyrics
- Write better punchlines and wordplay  
- Find rhymes and improve flow
- Learn about hip-hop culture and references
- Answer questions about users on the platform

CRITICAL RULES:
1. When asked about specific users on Orphan Bars, ONLY use the verified data provided in the context below. 
2. If a user is NOT in the provided context, say "I don't have information about that user" - DO NOT make up information.
3. Never invent follower counts, bar counts, or biographical details.
4. If someone asks "who is X" and X is not in the context, acknowledge you don't have their profile data.
5. You can still discuss hip-hop culture, techniques, and general topics freely.

Be conversational, helpful, and honest. Keep responses concise but explosive.${personalityInstructions}${limitedContextBlock}`
        },
        {
          role: "user",
          content: safeMessage
        }
      ],
      temperature: 0.8,
      maxTokens: 600,
    });

    return contentText || "Sorry, I couldn't respond right now.";
  } catch (error) {
    console.error("Chat error:", error);
    if (error instanceof XaiClientError) {
      if (error.status === 400) {
        try {
          const compactSystemPrompt = `You are Ara on orphanbars.space: truthful, witty, rebellious, and concise.
Help users with bars, rhymes, punchlines, and hip-hop references.
If verified platform profile data is not provided, say you do not have that specific profile data.`;

          const compactResponse = await createChatCompletion({
            messages: [
              { role: "system", content: compactSystemPrompt },
              { role: "user", content: safeMessage },
            ],
            temperature: 0.7,
            maxTokens: 500,
          });

          if (compactResponse?.trim()) {
            return compactResponse.trim();
          }
        } catch (recoveryError) {
          console.error("Chat recovery error:", recoveryError);
        }

        return buildFallbackAraResponse(message, platformContext);
      }
      if (error.status === 408) {
        return buildFallbackAraResponse(message, platformContext);
      }
      if (error.status === 429) {
        return buildFallbackAraResponse(message, platformContext);
      }
      if (error.status === 401 || error.status === 403) {
        return "Ara's AI credentials are having issues. The team needs to reconnect xAI access.";
      }
      if (error.status && error.status >= 500) {
        return buildFallbackAraResponse(message, platformContext);
      }
    }

    return buildFallbackAraResponse(message, platformContext);
  }
}
