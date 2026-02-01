import { db } from "./db";
import { bars, users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const fakeUsernames = [
  'VelvetVenom', 'ShadowScribe', 'NeonNinja', 'CrimsonCadence', 'PhantomPhrases',
  'GoldenTongue', 'IceQuill', 'RhymeRebel', 'MidnightMuse', 'ThunderVerb',
  'SilkSyntax', 'BronzeBard', 'EchoEthics', 'ViperVerse', 'CosmicCypher',
  'SteelSonnet', 'BlazeBallad', 'OnyxOracle', 'PrismPunchline', 'QuantumQuotes',
];

async function fixTimestamps() {
  console.log("Randomizing bar timestamps...");
  
  const fakeUsers = await db.select().from(users).where(inArray(users.username, fakeUsernames));
  const fakeUserIds = fakeUsers.map(u => u.id);
  
  const fakeBars = await db.select().from(bars).where(inArray(bars.userId, fakeUserIds));
  console.log(`Found ${fakeBars.length} bars from fake users`);
  
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  
  for (const bar of fakeBars) {
    const randomOffset = Math.floor(Math.random() * thirtyDaysMs);
    const newCreatedAt = new Date(now - randomOffset);
    
    await db.update(bars)
      .set({ createdAt: newCreatedAt })
      .where(eq(bars.id, bar.id));
  }
  
  console.log("✅ Timestamps randomized across the last 30 days!");
}

fixTimestamps()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
