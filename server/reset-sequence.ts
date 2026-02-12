import { db } from "./db";
import { bars, barSequence } from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { generateProofHash } from "./storage";

async function resetBarSequence() {
  console.log("🔄 Starting bar sequence reset...");
  
  try {
    // First, let's see what we have
    console.log("📊 Checking current state...");
    
    const currentSeq = await db.select().from(barSequence).where(eq(barSequence.id, "singleton"));
    console.log("Current sequence:", currentSeq);
    
    const lockedBars = await db.select().from(bars).where(eq(bars.isLocked, true));
    console.log(`Found ${lockedBars.length} locked bars`);
    
    // 1. Reset the sequence counter to 0
    console.log("🔄 Resetting sequence counter...");
    await db
      .update(barSequence)
      .set({ currentValue: 0 })
      .where(eq(barSequence.id, "singleton"));
    console.log("✅ Reset sequence counter to 0");
    
    // 2. Get all bars ordered by creation date (oldest first)
    const allBars = await db
      .select()
      .from(bars)
      .where(eq(bars.isLocked, true)) // Only locked bars get proof IDs
      .orderBy(asc(bars.createdAt));
    
    console.log(`📊 Processing ${allBars.length} locked bars...`);
    
    // 3. Assign new sequential proof IDs
    for (let i = 0; i < allBars.length; i++) {
      const bar = allBars[i];
      const sequenceNum = i + 1;
      const proofBarId = `orphanbars-#${sequenceNum.toString().padStart(5, '0')}`;
      const proofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, proofBarId);
      
      // Update the bar with new proof ID and hash
      await db
        .update(bars)
        .set({ 
          proofBarId,
          proofHash,
        })
        .where(eq(bars.id, bar.id));
      
      console.log(`📝 [${sequenceNum.toString().padStart(3, '0')}] ${proofBarId} - ${bar.content.substring(0, 40)}...`);
    }
    
    // 4. Update the sequence to the final number
    await db
      .update(barSequence)
      .set({ currentValue: allBars.length })
      .where(eq(barSequence.id, "singleton"));
    
    console.log(`\n✅ Complete! Renumbered ${allBars.length} bars`);
    console.log(`🎯 Next bar will be: orphanbars-#${(allBars.length + 1).toString().padStart(5, '0')}`);
    
  } catch (error: any) {
    console.error("❌ Failed to reset sequence:", error);
    console.error("Stack:", error?.stack);
    process.exit(1);
  }
}

resetBarSequence();
