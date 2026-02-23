import { Router } from "express";
import { db } from "../db";
import { messageOfTheDay, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { isAuthenticated, isOwner } from "../auth";

const router = Router();

// Get current active message of the day
router.get("/message-of-the-day", async (req, res) => {
  try {
    const [activeMessage] = await db
      .select({
        id: messageOfTheDay.id,
        message: messageOfTheDay.message,
        isActive: messageOfTheDay.isActive,
        createdAt: messageOfTheDay.createdAt,
        updatedAt: messageOfTheDay.updatedAt,
        createdBy: messageOfTheDay.createdBy,
        creatorUsername: users.username,
      })
      .from(messageOfTheDay)
      .leftJoin(users, eq(messageOfTheDay.createdBy, users.id))
      .where(eq(messageOfTheDay.isActive, true))
      .orderBy(desc(messageOfTheDay.createdAt))
      .limit(1);

    res.json(activeMessage || null);
  } catch (error) {
    console.error("Error fetching message of the day:", error);
    res.status(500).json({ message: "Failed to fetch message of the day" });
  }
});

// Get all messages (admin only)
router.get("/admin/message-of-the-day", isAuthenticated, isOwner, async (req, res) => {
  try {
    const messages = await db
      .select({
        id: messageOfTheDay.id,
        message: messageOfTheDay.message,
        isActive: messageOfTheDay.isActive,
        createdAt: messageOfTheDay.createdAt,
        updatedAt: messageOfTheDay.updatedAt,
        createdBy: messageOfTheDay.createdBy,
        creatorUsername: users.username,
      })
      .from(messageOfTheDay)
      .leftJoin(users, eq(messageOfTheDay.createdBy, users.id))
      .orderBy(desc(messageOfTheDay.createdAt));

    res.json(messages);
  } catch (error) {
    console.error("Error fetching all messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// Create or update message of the day (admin only)
router.post("/admin/message-of-the-day", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { message, isActive = true } = req.body;
    const userId = (req as any).user.id;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    // If setting a new message as active, deactivate all others
    if (isActive) {
      await db
        .update(messageOfTheDay)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(messageOfTheDay.isActive, true));
    }

    // Create new message
    const [newMessage] = await db
      .insert(messageOfTheDay)
      .values({
        message: message.trim(),
        isActive,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    res.json(newMessage);
  } catch (error) {
    console.error("Error creating message of the day:", error);
    res.status(500).json({ message: "Failed to create message" });
  }
});

// Update message (admin only)
router.put("/admin/message-of-the-day/:id", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isActive } = req.body;

    const updateData: any = { updatedAt: new Date() };
    
    if (message !== undefined) {
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }
      updateData.message = message.trim();
    }

    if (isActive !== undefined) {
      // If setting this message as active, deactivate all others
      if (isActive) {
        await db
          .update(messageOfTheDay)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(messageOfTheDay.isActive, true));
      }
      updateData.isActive = isActive;
    }

    const [updatedMessage] = await db
      .update(messageOfTheDay)
      .set(updateData)
      .where(eq(messageOfTheDay.id, id))
      .returning();

    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error("Error updating message of the day:", error);
    res.status(500).json({ message: "Failed to update message" });
  }
});

// Delete message (admin only)
router.delete("/admin/message-of-the-day/:id", isAuthenticated, isOwner, async (req, res) => {
  try {
    const { id } = req.params;

    const [deletedMessage] = await db
      .delete(messageOfTheDay)
      .where(eq(messageOfTheDay.id, id))
      .returning();

    if (!deletedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message of the day:", error);
    res.status(500).json({ message: "Failed to delete message" });
  }
});

export default router;
