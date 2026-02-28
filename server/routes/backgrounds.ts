import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { customBackgrounds, siteSettings, users } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import { isAuthenticated, isOwner } from "../auth";
import { insertCustomBackgroundSchema } from "@shared/schema";
import { objectStorageClient } from "../replit_integrations/object_storage";
import { randomUUID } from "crypto";

const router = Router();

// Configure multer for in-memory storage (stream to Object Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Helper: upload buffer to Object Storage, return public proxy URL.
// Falls back to local filesystem if PRIVATE_OBJECT_DIR is not configured.
async function uploadToObjectStorage(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const privateDir = (process.env.PRIVATE_OBJECT_DIR || '').replace(/\/$/, '');

  if (!privateDir) {
    // Local fallback: write to client/public/uploads/backgrounds/
    const ext = path.extname(filename) || '.jpg';
    const localName = `${randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'client', 'public', 'uploads', 'backgrounds');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, localName), buffer);
    return `/uploads/backgrounds/${localName}`;
  }

  const ext = path.extname(filename) || '.jpg';
  const objectName = `backgrounds/${randomUUID()}${ext}`;
  const fullPath = `${privateDir}/${objectName}`;
  const parts = fullPath.replace(/^\//, '').split('/');
  const bucketName = parts[0];
  const blobName = parts.slice(1).join('/');
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(blobName);
  await file.save(buffer, { contentType, resumable: false });
  return `/objects/${objectName}`;
}

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

// Upload custom background (owner only)
router.post("/backgrounds", isAuthenticated, isOwner, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const user = req.user as any;
    const name = req.body.name || req.file.originalname.split('.')[0];

    // Upload to Object Storage for persistence across deploys
    const imageUrl = await uploadToObjectStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Get the highest sort order to append at the end
    const lastBg = await db
      .select({ sortOrder: customBackgrounds.sortOrder })
      .from(customBackgrounds)
      .orderBy(desc(customBackgrounds.sortOrder))
      .limit(1);

    const nextSortOrder = lastBg.length > 0 ? lastBg[0].sortOrder + 1 : 0;

    const newBackground = await db.insert(customBackgrounds).values({
      name,
      imageUrl,
      createdBy: user.id,
      sortOrder: nextSortOrder,
      isActive: true,
    }).returning();

    res.status(201).json(newBackground[0]);
  } catch (error) {
    console.error("Error uploading background:", error);
    res.status(500).json({ error: "Failed to upload background" });
  }
});

// Get all backgrounds (admin only)
router.get("/admin/backgrounds", isAuthenticated, isOwner, async (req, res) => {
  try {
    const backgrounds = await db
      .select({
        sid: customBackgrounds.sid,
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
    const user = req.user as any;
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
      createdBy: user.id,
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
      .where(eq(customBackgrounds.sid, id))
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
      .where(eq(customBackgrounds.sid, id))
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
          .where(eq(customBackgrounds.sid, backgroundIds[i]));
      }
    });

    res.json({ message: "Backgrounds reordered successfully" });
  } catch (error) {
    console.error("Error reordering backgrounds:", error);
    res.status(500).json({ error: "Failed to reorder backgrounds" });
  }
});

// Get site-wide settings (public - needed on load for all users)
router.get("/site-settings", async (req, res) => {
  try {
    const rows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching site settings:", error);
    res.status(500).json({ error: "Failed to fetch site settings" });
  }
});

// Save site-wide appearance settings (owner only)
router.post("/site-settings", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { defaultBackground, themeSettings } = req.body;

    const upsertSetting = async (key: string, value: string) => {
      await db
        .insert(siteSettings)
        .values({ key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
    };

    if (defaultBackground !== undefined) {
      await upsertSetting('defaultBackground', String(defaultBackground));
    }

    if (themeSettings !== undefined) {
      await upsertSetting('themeSettings', JSON.stringify(themeSettings));
    }

    res.json({ message: "Site settings saved successfully" });
  } catch (error) {
    console.error("Error saving site settings:", error);
    res.status(500).json({ error: "Failed to save site settings" });
  }
});

export default router;
