import { openai } from "../image/client";

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

export async function moderateContent(content: string): Promise<ModerationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a content moderator for Orphan Bars, a platform for sharing rap lyrics and punchlines. 
          
Analyze the content for:
1. Inappropriate content (extreme violence, hate speech, explicit threats)
2. Plagiarism risk (if it sounds like famous lyrics from known songs)
3. Spam or low-quality content

Hip-hop culture allows: wordplay, metaphors, braggadocio, battle rap style disses, slang, and creative expression.
Do NOT flag content just because it's edgy, uses slang, or contains mild profanity - that's normal for rap.

Respond in JSON format:
{
  "approved": boolean,
  "flagged": boolean,
  "reasons": string[] (only if flagged),
  "plagiarismRisk": "none" | "low" | "medium" | "high",
  "plagiarismDetails": string (only if plagiarism detected - name the song/artist if known)
}`
        },
        {
          role: "user",
          content: `Moderate this bar:\n\n"${content}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      approved: result.approved !== false,
      flagged: result.flagged === true,
      reasons: result.reasons || [],
      plagiarismRisk: result.plagiarismRisk || "none",
      plagiarismDetails: result.plagiarismDetails,
    };
  } catch (error) {
    console.error("Moderation error:", error);
    return {
      approved: true,
      flagged: false,
      reasons: [],
      plagiarismRisk: "none",
    };
  }
}

export async function explainBar(content: string): Promise<BarExplanation> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
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
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
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

export async function chatWithAssistant(message: string, context?: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are Orphie, the AI assistant for Orphan Bars, a platform where lyricists share bars, punchlines, and wordplay. You help users:
- Understand and explain bars/lyrics
- Write better punchlines and wordplay  
- Find rhymes and improve flow
- Learn about hip-hop culture and references

Be conversational, helpful, and knowledgeable about hip-hop. Keep responses concise but informative.
${context ? `\nContext: ${context}` : ""}`
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || "Sorry, I couldn't respond right now.";
  } catch (error) {
    console.error("Chat error:", error);
    return "Sorry, I'm having trouble responding right now. Try again in a moment.";
  }
}
