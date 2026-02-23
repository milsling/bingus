import { Router } from "express";
import { db } from "../db";
import { bars, users, likes } from "@shared/schema";
import { eq, and, gte, count, sql, desc } from "drizzle-orm";

const router = Router();

// Get community statistics for QuickStats widget
router.get("/community/stats", async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total bars
    const [{ totalBars }] = await db
      .select({ totalBars: count() })
      .from(bars);

    // Bars this week
    const [{ barsThisWeek }] = await db
      .select({ barsThisWeek: count() })
      .from(bars)
      .where(gte(bars.createdAt, weekAgo));

    // Active writers this month (users who posted at least one bar)
    const [{ activeWritersMonth }] = await db
      .select({ activeWritersMonth: count() })
      .from(users)
      .where(
        and(
          exists(
            db
              .select({ id: bars.id })
              .from(bars)
              .where(and(eq(bars.userId, users.id), gte(bars.createdAt, monthAgo)))
          )
        )
      );

    res.json({
      totalBars,
      barsThisWeek,
      activeWritersMonth,
    });
  } catch (error) {
    console.error("Error fetching community stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

export default router;
