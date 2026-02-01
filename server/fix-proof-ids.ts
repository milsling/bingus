import { db } from "./db";
import { bars, barSequence } from "@shared/schema";
import { eq, asc, isNotNull, sql } from "drizzle-orm";
import crypto from "crypto";

function generateProofHash(content: string, timestamp: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${timestamp.toISOString()}|${userId}|${proofBarId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function fixProofIds() {
  console.log("Fixing proof bar IDs to be chronological...");
  
  // Get all bars with proof IDs, ordered by createdAt
  const allBars = await db.select({
    id: bars.id,
    content: bars.content,
    createdAt: bars.createdAt,
    userId: bars.userId,
    proofBarId: bars.proofBarId
  }).from(bars)
    .where(isNotNull(bars.proofBarId))
    .orderBy(asc(bars.createdAt));
  
  console.log(`Found ${allBars.length} bars with proof IDs`);
  
  // Use raw SQL to bypass trigger issues - update in small batches
  for (let i = 0; i < allBars.length; i++) {
    const bar = allBars[i];
    const newProofBarId = `orphanbars-#${String(i + 1).padStart(5, '0')}`;
    const newProofHash = generateProofHash(bar.content, bar.createdAt, bar.userId, newProofBarId);
    
    // Use raw SQL to update, avoiding large payloads
    await db.execute(sql`
      UPDATE bars 
      SET proof_bar_id = ${newProofBarId}, proof_hash = ${newProofHash}
      WHERE id = ${bar.id}
    `);
    
    if ((i + 1) % 10 === 0) {
      console.log(`Updated ${i + 1}/${allBars.length} bars`);
    }
  }
  
  // Update the bar_sequence to match the count
  const count = allBars.length;
  await db.execute(sql`
    INSERT INTO bar_sequence (id, current_value) 
    VALUES ('singleton', ${count})
    ON CONFLICT (id) DO UPDATE SET current_value = ${count}
  `);
  
  console.log(`\n✅ Fixed ${allBars.length} proof bar IDs in chronological order!`);
  console.log(`Bar sequence updated to ${count}`);
}

fixProofIds()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
