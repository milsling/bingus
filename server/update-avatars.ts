import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const avatarMap: Record<string, string> = {
  'VelvetVenom': '/avatars/velvetvenom.png',
  'ShadowScribe': '/avatars/shadowscribe.png',
  'NeonNinja': '/avatars/neonninja.png',
  'CrimsonCadence': '/avatars/crimsoncadence.png',
  'PhantomPhrases': '/avatars/phantomphrases.png',
  'GoldenTongue': '/avatars/goldentongue.png',
  'IceQuill': '/avatars/icequill.png',
  'RhymeRebel': '/avatars/rhymerebel.png',
  'MidnightMuse': '/avatars/midnightmuse.png',
  'ThunderVerb': '/avatars/thunderverb.png',
  'SilkSyntax': '/avatars/silksyntax.png',
  'BronzeBard': '/avatars/bronzebard.png',
  'EchoEthics': '/avatars/echoethics.png',
  'ViperVerse': '/avatars/viperverse.png',
  'CosmicCypher': '/avatars/cosmiccypher.png',
  'SteelSonnet': '/avatars/steelsonnet.png',
  'BlazeBallad': '/avatars/blazeballad.png',
  'OnyxOracle': '/avatars/onyxoracle.png',
  'PrismPunchline': '/avatars/prismpunchline.png',
  'QuantumQuotes': '/avatars/quantumquotes.png',
};

async function updateAvatars() {
  console.log("Updating fake user avatars...");
  
  for (const [username, avatarUrl] of Object.entries(avatarMap)) {
    await db.update(users)
      .set({ avatarUrl })
      .where(eq(users.username, username));
    console.log(`Updated avatar for ${username}`);
  }
  
  console.log("\n✅ All avatars updated!");
}

updateAvatars()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
