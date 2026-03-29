import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";

const router = Router();

// GET /api/songs — user's songs list
router.get("/songs", isAuthenticated, async (req, res) => {
  try {
    const songs = await storage.getUserSongs(req.user!.id);
    res.json(songs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/songs/:id — full song with sections
router.get("/songs/:id", isAuthenticated, async (req, res) => {
  try {
    const song = await storage.getSongById(req.params.id);
    if (!song) return res.status(404).json({ error: "Song not found" });
    if (song.userId !== req.user!.id) return res.status(403).json({ error: "Not your song" });
    res.json(song);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/songs — create song
router.post("/songs", isAuthenticated, async (req, res) => {
  try {
    const { title } = req.body;
    const song = await storage.createSong(req.user!.id, title);
    res.status(201).json(song);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/songs/:id — update song metadata
router.patch("/songs/:id", isAuthenticated, async (req, res) => {
  try {
    const song = await storage.updateSong(req.params.id, req.user!.id, req.body);
    if (!song) return res.status(404).json({ error: "Song not found or not yours" });
    res.json(song);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/songs/:id — delete song
router.delete("/songs/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteSong(req.params.id, req.user!.id);
    if (!deleted) return res.status(404).json({ error: "Song not found or not yours" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/songs/:id/sections — add section
router.post("/songs/:id/sections", isAuthenticated, async (req, res) => {
  try {
    const { type, label, content, position } = req.body;
    if (!type) return res.status(400).json({ error: "Section type required" });
    const section = await storage.addSongSection(req.params.id, {
      songId: req.params.id,
      type,
      label: label || null,
      content: content || "",
      position,
    });
    res.status(201).json(section);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/songs/:songId/sections/:sectionId — update section
router.patch("/songs/:songId/sections/:sectionId", isAuthenticated, async (req, res) => {
  try {
    // Verify song ownership
    const song = await storage.getSongById(req.params.songId);
    if (!song || song.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not your song" });
    }
    const section = await storage.updateSongSection(req.params.sectionId, req.body);
    if (!section) return res.status(404).json({ error: "Section not found" });
    res.json(section);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/songs/:songId/sections/:sectionId — delete section
router.delete("/songs/:songId/sections/:sectionId", isAuthenticated, async (req, res) => {
  try {
    // Verify song ownership
    const song = await storage.getSongById(req.params.songId);
    if (!song || song.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not your song" });
    }
    const deleted = await storage.deleteSongSection(req.params.sectionId);
    if (!deleted) return res.status(404).json({ error: "Section not found" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/songs/:id/sections/reorder — reorder sections
router.post("/songs/:id/sections/reorder", isAuthenticated, async (req, res) => {
  try {
    // Verify song ownership
    const song = await storage.getSongById(req.params.id);
    if (!song || song.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not your song" });
    }
    const { orderedIds } = req.body;
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds array required" });
    }
    await storage.reorderSongSections(req.params.id, orderedIds);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
