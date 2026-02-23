import { Router } from "express";
import { db } from "../db";
import { customBackgrounds, users } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import { isAuthenticated, isOwner } from "../auth";
import { insertCustomBackgroundSchema } from "@shared/schema";

const router = Router();

// Get all backgrounds (including custom ones)
router.get("/backgrounds", async (req, res) => {
  try {
    // Get custom backgrounds from database
    const customBg = await db
      .select()
      .from(customBackgrounds)
      .where(eq(customBackgrounds.isActive, true))
      .orderBy(asc(customBackgrounds.sortOrder));

    res.json(customBg);
  } catch (error) {
    console.error("Error fetching backgrounds:", error);
    res.status(500).json({ error: "Failed to fetch backgrounds" });
  }
});

// Get all backgrounds (admin only)
router.get("/admin/backgrounds", isAuthenticated, isOwner, async (req, res) => {
  try {
    const backgrounds = await db
      .select({
        id: customBackgrounds.id,
        name: customBackgrounds.name,
        imageUrl: customBackgrounds.imageUrl,
        isActive: customBackgrounds.isActive,
        sortOrder: customBackgrounds.sortOrder,
        createdAt: customBackgrounds.createdAt,
        updatedAt: customBackgrounds.updatedAt,
        createdBy: customBackgrounds.createdBy,
        creatorName: users.username,
      })
      .from(customBackgrounds)
      .leftJoin(users, eq(customBackgrounds.createdBy, users.id))
      .orderBy(desc(customBackgrounds.createdAt));

    res.json(backgrounds);
  } catch (error) {
    console.error("Error fetching backgrounds:", error);
    res.status(500).json({ error: "Failed to fetch backgrounds" });
  }
});

// Create new background (admin only)
router.post("/admin/backgrounds", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { currentUser } = req;
    const validatedData = insertCustomBackgroundSchema.parse(req.body);

    // Get the highest sort order to append at the end
    const lastBg = await db
      .select({ sortOrder: customBackgrounds.sortOrder })
      .from(customBackgrounds)
      .orderBy(desc(customBackgrounds.sortOrder))
      .limit(1);

    const nextSortOrder = lastBg.length > 0 ? lastBg[0].sortOrder + 1 : 0;

    const newBackground = await db.insert(customBackgrounds).values({
      ...validatedData,
      createdBy: currentUser!.id,
      sortOrder: validatedData.sortOrder || nextSortOrder,
    }).returning();

    res.status(201).json(newBackground[0]);
  } catch (error) {
    console.error("Error creating background:", error);
    res.status(500).json({ error: "Failed to create background" });
  }
});

// Update background (admin only)
router.put("/admin/backgrounds/:id", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertCustomBackgroundSchema.partial().parse(req.body);

    const updatedBackground = await db
      .update(customBackgrounds)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(customBackgrounds.id, id))
      .returning();

    if (updatedBackground.length === 0) {
      return res.status(404).json({ error: "Background not found" });
    }

    res.json(updatedBackground[0]);
  } catch (error) {
    console.error("Error updating background:", error);
    res.status(500).json({ error: "Failed to update background" });
  }
});

// Delete background (admin only)
router.delete("/admin/backgrounds/:id", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBackground = await db
      .delete(customBackgrounds)
      .where(eq(customBackgrounds.id, id))
      .returning();

    if (deletedBackground.length === 0) {
      return res.status(404).json({ error: "Background not found" });
    }

    res.json({ message: "Background deleted successfully" });
  } catch (error) {
    console.error("Error deleting background:", error);
    res.status(500).json({ error: "Failed to delete background" });
  }
});

// Reorder backgrounds (admin only)
router.post("/admin/backgrounds/reorder", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { backgroundIds } = req.body;

    if (!Array.isArray(backgroundIds)) {
      return res.status(400).json({ error: "backgroundIds must be an array" });
    }

    // Update sort orders in a transaction
    await db.transaction(async (tx) => {
      for (let i = 0; i < backgroundIds.length; i++) {
        await tx
          .update(customBackgrounds)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(customBackgrounds.id, backgroundIds[i]));
      }
    });

    res.json({ message: "Backgrounds reordered successfully" });
  } catch (error) {
    console.error("Error reordering backgrounds:", error);
    res.status(500).json({ error: "Failed to reorder backgrounds" });
  }
});

export default router;
