import type { Express, RequestHandler } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", isAuthenticated, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Request a presigned URL for badge image upload (owner only).
   */
  app.post("/api/uploads/badge-image", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user?.isOwner) {
        return res.status(403).json({ error: "Only site owner can upload badge images" });
      }

      const { badgeId, extension } = req.body;
      if (!badgeId || !extension) {
        return res.status(400).json({ error: "Missing required fields: badgeId, extension" });
      }

      const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
      const ext = extension.toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({ error: `Invalid extension. Allowed: ${allowedExtensions.join(', ')}` });
      }

      const { uploadURL, publicURL } = await objectStorageService.getBadgeImageUploadURL(badgeId, ext);

      res.json({ uploadURL, publicURL });
    } catch (error) {
      console.error("Error generating badge upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve badge images from private storage (publicly accessible via proxy).
   */
  app.get("/objects/badges/:fileName", async (req, res) => {
    try {
      const fileName = req.params.fileName;
      const file = await objectStorageService.getBadgeImageFile(fileName);
      await objectStorageService.downloadObject(file, res, 86400);
    } catch (error) {
      console.error("Error serving badge image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Badge image not found" });
      }
      return res.status(500).json({ error: "Failed to serve badge image" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

