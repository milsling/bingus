import { db } from "./db";
import { barSequence, bars } from "@shared/schema";
import { eq, desc, max } from "drizzle-orm";

async function auditSequence() {
  try {
    console.log("Starting audit...");
    
    // Get current sequence value
    const seq = await db.select().from(barSequence).where(eq(barSequence.id, "singleton"));
    console.log("Sequence query result:", seq);
    console.log("Current sequence in DB:", seq[0]?.currentValue || "NOT FOUND");
    
    // Get all locked bars
    const lockedBars = await db
      .select({ proofBarId: bars.proofBarId })
      .from(bars)
      .where(eq(bars.isLocked, true));
    
    console.log("Locked bars query result:", lockedBars);
    console.log("Total locked bars:", lockedBars.length);
    
    if (lockedBars.length === 0) {
      console.log("No locked bars found");
      return;
    }
    
    // Extract numbers from proofBarId (format: orphanbars-#00042)
    const numbers = lockedBars
      .map(b => {
        const match = b.proofBarId?.match(/#(\d+)/);
        return match ? Number(match[1]) : null;
      })
      .filter(Boolean);
    
    console.log("Extracted numbers:", numbers);
    
    const maxLocked = Math.max(...numbers);
    console.log("Highest locked bar number:", maxLocked);
    
    // Check if sequence is ahead of actual locked bars
    if (seq[0] && seq[0].currentValue > maxLocked + 1) {
      console.log(`⚠️  Sequence is too high! Current: ${seq[0].currentValue}, should be: ${maxLocked + 1}`);
      
      // Fix the sequence
      await db
        .update(barSequence)
        .set({ currentValue: maxLocked + 1 })
        .where(eq(barSequence.id, "singleton"));
      
      console.log("✅ Fixed sequence to:", maxLocked + 1);
    } else {
      console.log("✅ Sequence looks correct");
    }
    
    // Show some sample proofBarIds
    console.log("\nSample locked bar IDs:");
    lockedBars.slice(0, 10).forEach(bar => {
      console.log("  ", bar.proofBarId);
    });
    
  } catch (error) {
    console.error("Audit failed:", error);
  }
}

auditSequence();
