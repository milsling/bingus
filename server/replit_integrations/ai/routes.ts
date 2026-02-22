import type { Express, Request, Response } from "express";
import { moderateContent, explainBar, suggestRhymes, chatWithAssistant, analyzeUserStyle, type PlatformContext, type StyleAnalysis } from "./barAssistant";
import { storage } from "../../storage";
import { getXaiRuntimeDiagnostics } from "./xaiClient";
import { AccessToken } from "livekit-server-sdk";

function extractPotentialUsernames(message: string): string[] {
  const usernames: string[] = [];
  const stopWords = new Set([
    "the", "a", "an", "this", "that", "it", "bars", "hip", "hop", "rap", 
    "rhymes", "wordplay", "lyrics", "music", "song", "verse", "flow",
    "punchline", "metaphor", "me", "you", "them", "us", "we", "my", "your"
  ]);
  
  const atMentions = message.match(/@(\w+)/g);
  if (atMentions) {
    usernames.push(...atMentions.map(m => m.slice(1).toLowerCase()));
  }
  
  const whoIsPattern = /who\s+is\s+(\w+)/gi;
  let match;
  while ((match = whoIsPattern.exec(message)) !== null) {
    const word = match[1].toLowerCase();
    if (!stopWords.has(word) && word.length > 2) {
      usernames.push(word);
    }
  }
  
  const tellMeAboutPattern = /tell\s+me\s+about\s+(\w+)/gi;
  while ((match = tellMeAboutPattern.exec(message)) !== null) {
    const word = match[1].toLowerCase();
    if (!stopWords.has(word) && word.length > 2) {
      usernames.push(word);
    }
  }
  
  return Array.from(new Set(usernames));
}

function isStyleAnalysisRequest(message: string): boolean {
  const stylePatterns = [
    /style/i,
    /analyze.*(?:bars?|lyrics?|writing)/i,
    /(?:bars?|lyrics?|writing).*analyze/i,
    /what.*(?:type|kind).*(?:rapper|lyricist|writer)/i,
    /how.*(?:write|rap|spit)/i,
    /(?:describe|breakdown|break down).*(?:style|flow|bars?)/i,
    /(?:lyrical|rapping|writing)\s*style/i,
  ];
  return stylePatterns.some(pattern => pattern.test(message));
}

interface ExtendedPlatformContext extends PlatformContext {
  styleAnalyses?: Record<string, StyleAnalysis>;
}

async function buildPlatformContext(usernames: string[], includeStyleAnalysis: boolean = false): Promise<ExtendedPlatformContext> {
  const context: ExtendedPlatformContext = { users: [], bars: [], styleAnalyses: {} };
  
  for (const username of usernames.slice(0, 3)) {
    try {
      const user = await storage.getUserByUsername(username);
      if (user) {
        const stats = await storage.getUserStats(user.id);
        const userBars = await storage.getBarsByUser(user.id);
        const followingCount = await storage.getFollowingCount(user.id);
        
        const publicBars = userBars
          .filter(b => b.permissionStatus !== "private")
          .slice(0, includeStyleAnalysis ? 20 : 6)
          .map(b => b.content.substring(0, 300));
        
        context.users!.push({
          username: user.username,
          bio: user.bio || undefined,
          barCount: stats.barsMinted,
          followerCount: stats.followers,
          followingCount: followingCount,
          isOwner: user.isOwner || false,
          isAdmin: user.isAdmin || false,
          topBars: publicBars,
        });
        
        if (includeStyleAnalysis && publicBars.length > 0) {
          const styleAnalysis = await analyzeUserStyle(publicBars, user.username);
          context.styleAnalyses![user.username.toLowerCase()] = styleAnalysis;
        }
      }
    } catch (e) {
      console.error(`Failed to lookup user ${username}:`, e);
    }
  }
  
  return context;
}

export function registerAIRoutes(app: Express): void {
  app.get("/api/ai/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated?.() || !req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const canViewStatus = Boolean(req.user.isOwner || req.user.isAdmin);
      if (!canViewStatus) {
        return res.status(403).json({ error: "Admin or owner access required" });
      }

      const settings = await storage.getAISettings();
      const diagnostics = getXaiRuntimeDiagnostics();
      const ready = settings.orphieChatEnabled && diagnostics.configured && !diagnostics.lastError;

      const reason = !settings.orphieChatEnabled
        ? "chat_disabled"
        : !diagnostics.configured
          ? "missing_api_key"
          : diagnostics.lastError
            ? "upstream_error"
            : "ok";

      return res.json({
        ready,
        reason,
        chatEnabled: settings.orphieChatEnabled,
        xaiConfigured: diagnostics.configured,
        model: diagnostics.model,
        lastRequestAt: diagnostics.lastRequestAt,
        lastSuccessAt: diagnostics.lastSuccessAt,
        lastError: diagnostics.lastError,
      });
    } catch (error) {
      console.error("AI status API error:", error);
      return res.status(500).json({ error: "Status check failed" });
    }
  });

  // Voice chat is now handled via WebSocket at /ws/voice
  // See server/voice-proxy.ts for implementation

  app.post("/api/ai/sts", async (req: Request, res: Response) => {
    try {
      const stsEnabled = process.env.AI_STS_ENABLED === "true";
      if (!stsEnabled) {
        return res.status(404).json({ error: "STS is not available" });
      }

      if (!req.isAuthenticated?.() || !req.user?.id) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const isPremium = user.membershipTier === "donor_plus";
      const { message } = req.body as { message?: string };
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!isPremium) {
        return res.status(403).json({
          error: "Premium required",
          response: "Whoa, premium vibes detected! Upgrade your account on orphanbars.space to unlock STS—it's like giving me a voice that could narrate your wildest dreams (or nightmares).",
          mode: "text",
        });
      }

      return res.json({
        response: "Ara 2.0 STS (speech-to-speech) is coming soon. xAI's STS is currently only available via their agent model—so for now you can still chat with me in text (and use VTT on Ara 1.0).",
        mode: "text",
        comingSoon: true,
      });
    } catch (error) {
      console.error("STS API error:", error);
      return res.status(500).json({ error: "STS failed" });
    }
  });

  app.post("/api/ai/moderate", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAISettings();
      if (!settings.moderationEnabled) {
        return res.json({ approved: true, flagged: false, reasons: [], plagiarismRisk: "none" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      const result = await moderateContent(content, settings.moderationStrictness);
      res.json(result);
    } catch (error) {
      console.error("Moderation API error:", error);
      res.status(500).json({ error: "Moderation failed" });
    }
  });

  app.post("/api/ai/explain", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAISettings();
      if (!settings.barExplanationsEnabled) {
        return res.status(403).json({ error: "Bar explanations are currently disabled" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }
      const result = await explainBar(content);
      res.json(result);
    } catch (error) {
      console.error("Explain API error:", error);
      res.status(500).json({ error: "Explanation failed" });
    }
  });

  app.post("/api/ai/suggest", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAISettings();
      if (!settings.rhymeSuggestionsEnabled) {
        return res.status(403).json({ error: "Rhyme suggestions are currently disabled" });
      }
      const { topic, style } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }
      const result = await suggestRhymes(topic, style);
      res.json(result);
    } catch (error) {
      console.error("Suggest API error:", error);
      res.status(500).json({ error: "Suggestion failed" });
    }
  });

  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAISettings();
      if (!settings.orphieChatEnabled) {
        return res.status(403).json({ error: "Ara chat is currently disabled" });
      }
      
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const potentialUsernames = extractPotentialUsernames(message);
      const needsStyleAnalysis = settings.styleAnalysisEnabled && isStyleAnalysisRequest(message) && potentialUsernames.length > 0;
      
      const platformContext = potentialUsernames.length > 0 
        ? await buildPlatformContext(potentialUsernames, needsStyleAnalysis)
        : undefined;
      
      let enrichedMessage = message;
      if (needsStyleAnalysis && platformContext?.styleAnalyses) {
        const styleInfoBlocks: string[] = [];
        for (const [username, analysis] of Object.entries(platformContext.styleAnalyses)) {
          styleInfoBlocks.push(`
=== STYLE ANALYSIS FOR @${username} ===
Primary Style: ${analysis.primaryStyle}
Secondary Styles: ${analysis.secondaryStyles.join(", ") || "N/A"}
Strengths: ${analysis.strengths.join(", ") || "N/A"}
Characteristics: ${analysis.characteristics.join(", ") || "N/A"}
Comparison: ${analysis.comparison || "N/A"}
Summary: ${analysis.summary}
=== END STYLE ANALYSIS ===`);
        }
        if (styleInfoBlocks.length > 0) {
          enrichedMessage = message + "\n\n[CONTEXT: The user is asking about style. Use this analysis data to respond:]\n" + styleInfoBlocks.join("\n");
        }
      }
      
      const response = await chatWithAssistant(enrichedMessage, platformContext, settings.orphiePersonality || undefined);
      res.json({ response });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Chat failed" });
    }
  });
}
