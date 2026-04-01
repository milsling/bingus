import { Router } from "express";
import { storage } from "../storage";
import { createClient } from "@supabase/supabase-js";
import { isAuthenticated } from "../auth";
import { moderateContent } from "../replit_integrations/ai/barAssistant";

const router = Router();

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/x-pn-wav",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
]);

const ALLOWED_AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac"]);

function normalizeContentType(contentType?: string): string {
  return (contentType || "").split(";")[0].trim().toLowerCase();
}

function getExtension(filename?: string): string {
  const parts = (filename || "").toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function inferContentTypeFromExtension(ext: string): string {
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg") return "audio/ogg";
  if (ext === "flac") return "audio/flac";
  return "audio/mpeg";
}

function isSupportedAudioFile(filename: string, contentType?: string): boolean {
  const normalized = normalizeContentType(contentType);
  const ext = getExtension(filename);
  const mimeAllowed = normalized ? ALLOWED_AUDIO_MIME_TYPES.has(normalized) : false;
  const extAllowed = ALLOWED_AUDIO_EXTENSIONS.has(ext);
  return mimeAllowed || extAllowed;
}

function canUploadBeats(user: any): boolean {
  return Boolean(
    user?.isOwner ||
    user?.isProducer ||
    user?.userRole === "producer" ||
    user?.userRole === "both",
  );
}

function buildBeatModerationInput(payload: {
  title?: string;
  genre?: string;
  key?: string;
  tags?: string[];
  description?: string;
  credits?: string;
  audioUrl?: string;
}): string {
  return [
    `Beat title: ${payload.title || ""}`,
    `Genre: ${payload.genre || ""}`,
    `Key: ${payload.key || ""}`,
    `Tags: ${(payload.tags || []).join(", ")}`,
    `Description: ${payload.description || ""}`,
    `Credits: ${payload.credits || ""}`,
    `Audio file: ${payload.audioUrl || ""}`,
  ].join("\n");
}

// Initialize Supabase admin client for storage operations
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase config missing");
  return createClient(url, key);
}

// GET /api/beats — list beats with filters
router.get("/beats", async (req, res) => {
  try {
    const { search, bpm_min, bpm_max, key, genre, producerId, sort, page, limit } = req.query;
    const result = await storage.getBeats(
      {
        search: search as string,
        bpm_min: bpm_min ? Number(bpm_min) : undefined,
        bpm_max: bpm_max ? Number(bpm_max) : undefined,
        key: key as string,
        genre: genre as string,
        producerId: producerId as string,
        sort: sort as string,
      },
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/beats/favorites — user's favorited beats
router.get("/beats/favorites", isAuthenticated, async (req, res) => {
  try {
    const beats = await storage.getUserFavoriteBeats(req.user!.id);
    res.json(beats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/beats/my — user's uploaded beats
router.get("/beats/my", isAuthenticated, async (req, res) => {
  try {
    const beats = await storage.getUserBeats(req.user!.id);
    res.json(beats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/beats/:id — single beat
router.get("/beats/:id", async (req, res) => {
  try {
    const beat = await storage.getBeatById(req.params.id);
    if (!beat) return res.status(404).json({ error: "Beat not found" });
    // Attach favorite status if user is logged in
    if (req.user) {
      beat.isFavorited = await storage.hasUserFavoritedBeat(req.user.id, beat.id);
    }
    res.json(beat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/beats/upload-url — get signed upload URL for Supabase Storage
router.post("/beats/upload-url", isAuthenticated, async (req, res) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) {
      return res.status(400).json({ error: "filename and contentType required" });
    }

    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!canUploadBeats(user)) {
      return res.status(403).json({ error: "Only producer accounts can upload beats." });
    }

    if (!isSupportedAudioFile(filename, contentType)) {
      return res.status(400).json({ error: "Unsupported audio format. Use MP3, WAV, OGG, or FLAC." });
    }

    const supabase = getSupabaseAdmin();
    const ext = getExtension(filename) || "mp3";
    const path = `${req.user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage.from("beats").createSignedUploadUrl(path);
    if (error) throw error;

    res.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/beats/${path}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/beats — create beat record after upload
router.post("/beats", isAuthenticated, async (req, res) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(401).json({ error: "User not found" });

    if (!canUploadBeats(user)) {
      return res.status(403).json({ error: "Only producer accounts can upload beats." });
    }

    const { title, audioUrl, waveformData, coverArtUrl, bpm, key, genre, tags, duration, description, credits, licenseType, isPublic } = req.body;

    if (!title || !audioUrl) {
      return res.status(400).json({ error: "title and audioUrl required" });
    }

    const aiSettings = await storage.getAISettings();
    if (aiSettings.moderationEnabled) {
      const moderationInput = buildBeatModerationInput({
        title,
        genre,
        key,
        tags,
        description,
        credits,
        audioUrl,
      });
      const moderation = await moderateContent(
        moderationInput,
        aiSettings.moderationStrictness || "balanced",
      );

      if (!moderation.approved || moderation.flagged) {
        return res.status(400).json({
          error: "Beat metadata was not approved by moderation.",
          aiRejected: true,
          reasons: moderation.reasons,
        });
      }
    }

    const beat = await storage.createBeat({
      producerId: req.user!.id,
      title,
      audioUrl,
      waveformData: waveformData || null,
      coverArtUrl: coverArtUrl || null,
      bpm: bpm ? Number(bpm) : null,
      key: key || null,
      genre: genre || null,
      tags: tags || [],
      duration: duration ? Number(duration) : null,
      description: description || null,
      credits: credits || null,
      licenseType: licenseType || "preview_only",
      isPublic: isPublic ?? false,
      status: "approved",
    });

    res.status(201).json(beat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/beats/:id — update beat metadata
router.patch("/beats/:id", isAuthenticated, async (req, res) => {
  try {
    const beat = await storage.updateBeat(req.params.id, req.user!.id, req.body);
    if (!beat) return res.status(404).json({ error: "Beat not found or not yours" });
    res.json(beat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/beats/:id — delete beat
router.delete("/beats/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteBeat(req.params.id, req.user!.id);
    if (!deleted) return res.status(404).json({ error: "Beat not found or not yours" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/beats/:id/play — increment play count
router.post("/beats/:id/play", async (req, res) => {
  try {
    await storage.incrementBeatPlays(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/beats/:id/favorite — toggle favorite
router.post("/beats/:id/favorite", isAuthenticated, async (req, res) => {
  try {
    const isFavorited = await storage.toggleBeatFavorite(req.user!.id, req.params.id);
    res.json({ isFavorited });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
