import { db } from "./db";
import { bars } from "@shared/schema";
import { eq, asc, isNotNull } from "drizzle-orm";
import crypto from "crypto";

function generateProofHash(content: string, timestamp: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${timestamp.toISOString()}|${userId}|${proofBarId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function fixProofIds() {
  console.log("Fixing proof bar IDs to be chronological...");
  
  // Get all bars with proof IDs, ordered by createdAt
  const allBars = await db.select().from(bars)
    .where(isNotNull(bars.proofBarId))
    .orderBy(asc(bars.createdAt));
  
  console.log(`Found ${allBars.length} bars with proof IDs`);
  
  // Reassign proof IDs in chronological order
  for (let i = 0; i < allBars.length; i++) {
    const bar = allBars[i];
    const newProofBarId = `orphanbars-#${String(i + 1).padStart(5, '0')}`;
    const newProofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, newProofBarId);
    
    await db.update(bars)
      .set({ 
        proofBarId: newProofBarId,
        proofHash: newProofHash 
      })
      .where(eq(bars.id, bar.id));
    
    if ((i + 1) % 10 === 0) {
      console.log(`Updated ${i + 1}/${allBars.length} bars`);
    }
  }
  
  console.log(`\n✅ Fixed ${allBars.length} proof bar IDs in chronological order!`);
}

fixProofIds()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
