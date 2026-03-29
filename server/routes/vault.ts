import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";

const router = Router();

// GET /api/vault/stats — vault dashboard stats
router.get("/vault/stats", isAuthenticated, async (req, res) => {
  try {
    const stats = await storage.getVaultStats(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/bars — all user's bars with filters
router.get("/vault/bars", isAuthenticated, async (req, res) => {
  try {
    const { search, tags, folderId, sort, page, limit } = req.query;
    const result = await storage.getVaultBars(
      req.user!.id,
      {
        search: search as string,
        tags: tags ? (tags as string).split(",") : undefined,
        folderId: folderId as string,
        sort: sort as string,
      },
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/folders — user's folders
router.get("/vault/folders", isAuthenticated, async (req, res) => {
  try {
    const folders = await storage.getUserFolders(req.user!.id);
    res.json(folders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vault/folders — create folder
router.post("/vault/folders", isAuthenticated, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Folder name required" });
    const folder = await storage.createFolder(req.user!.id, name, description);
    res.status(201).json(folder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/vault/folders/:id — update folder
router.patch("/vault/folders/:id", isAuthenticated, async (req, res) => {
  try {
    const folder = await storage.updateFolder(req.params.id, req.user!.id, req.body);
    if (!folder) return res.status(404).json({ error: "Folder not found" });
    res.json(folder);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vault/folders/:id — delete folder
router.delete("/vault/folders/:id", isAuthenticated, async (req, res) => {
  try {
    const deleted = await storage.deleteFolder(req.params.id, req.user!.id);
    if (!deleted) return res.status(404).json({ error: "Folder not found" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/vault/folders/:id/bars — add bar to folder
router.post("/vault/folders/:id/bars", isAuthenticated, async (req, res) => {
  try {
    const { barId } = req.body;
    if (!barId) return res.status(400).json({ error: "barId required" });
    // Verify folder ownership
    const userFolders = await storage.getUserFolders(req.user!.id);
    if (!userFolders.some((f: any) => f.id === req.params.id)) {
      return res.status(403).json({ error: "Not your folder" });
    }
    await storage.addBarToFolder(req.params.id, barId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/vault/folders/:folderId/bars/:barId — remove bar from folder
router.delete("/vault/folders/:folderId/bars/:barId", isAuthenticated, async (req, res) => {
  try {
    // Verify folder ownership
    const userFolders = await storage.getUserFolders(req.user!.id);
    if (!userFolders.some((f: any) => f.id === req.params.folderId)) {
      return res.status(403).json({ error: "Not your folder" });
    }
    const removed = await storage.removeBarFromFolder(req.params.folderId, req.params.barId);
    if (!removed) return res.status(404).json({ error: "Bar not in folder" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/folders/:id/bars — get bars in a folder
router.get("/vault/folders/:id/bars", isAuthenticated, async (req, res) => {
  try {
    // Verify folder ownership
    const userFolders = await storage.getUserFolders(req.user!.id);
    if (!userFolders.some((f: any) => f.id === req.params.id)) {
      return res.status(403).json({ error: "Not your folder" });
    }
    const bars = await storage.getFolderBars(req.params.id);
    res.json(bars);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/vault/bar-versions/:barId — get version history for a bar
router.get("/vault/bar-versions/:barId", isAuthenticated, async (req, res) => {
  try {
    const versions = await storage.getBarVersions(req.params.barId);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
