import { db } from "./db";
import { bars, barSequence } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { createHash } from "crypto";

function generateProofHash(content: string, createdAt: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${createdAt.toISOString()}|${userId}|${proofBarId}`;
  return createHash('sha256').update(data).digest('hex');
}

async function resetBarSequence() {
  console.log("🔄 Starting bar sequence reset...");
  
  try {
    // Check current state
    console.log("📊 Checking current state...");
    
    const lockedBars = await db.select().from(bars).where(eq(bars.isLocked, true));
    console.log(`Found ${lockedBars.length} locked bars`);
    
    if (lockedBars.length === 0) {
      console.log("⚠️ No locked bars found. Nothing to reset.");
      return;
    }
    
    // Sort by creation date
    lockedBars.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Reset sequence
    await db
      .update(barSequence)
      .set({ currentValue: 0 })
      .where(eq(barSequence.id, "singleton"));
    console.log("✅ Reset sequence counter to 0");
    
    // Renumber bars
    for (let i = 0; i < lockedBars.length; i++) {
      const bar = lockedBars[i];
      const sequenceNum = i + 1;
      const proofBarId = `orphanbars-#${sequenceNum.toString().padStart(5, '0')}`;
      const proofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, proofBarId);
      
      await db
        .update(bars)
        .set({ 
          proofBarId,
          proofHash,
        })
        .where(eq(bars.id, bar.id));
      
      console.log(`📝 [${sequenceNum.toString().padStart(3, '0')}] ${proofBarId} - ${bar.content.substring(0, 40)}...`);
    }
    
    // Update final sequence
    await db
      .update(barSequence)
      .set({ currentValue: lockedBars.length })
      .where(eq(barSequence.id, "singleton"));
    
    console.log(`\n✅ Complete! Renumbered ${lockedBars.length} bars`);
    console.log(`🎯 Next bar will be: orphanbars-#${(lockedBars.length + 1).toString().padStart(5, '0')}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

resetBarSequence();
