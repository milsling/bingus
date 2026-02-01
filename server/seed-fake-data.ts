import { db } from "./db";
import { users, bars, likes, comments, follows, dislikes, userAchievements, ACHIEVEMENTS, type AchievementId } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const achievementAssignments: Record<string, AchievementId[]> = {
  'VelvetVenom': ['first_bar', 'bar_slinger', 'rising_star', 'streak_starter'],
  'ShadowScribe': ['first_bar', 'wordsmith', 'bar_slinger', 'reply_king'],
  'NeonNinja': ['first_bar', 'bar_slinger', 'rising_star', 'weekend_warrior'],
  'CrimsonCadence': ['first_bar', 'wordsmith', 'streak_master'],
  'PhantomPhrases': ['first_bar', 'bar_slinger', 'viral', 'crowd_pleaser'],
  'GoldenTongue': ['first_bar', 'bar_lord', 'bar_slinger', 'wordsmith', 'viral'],
  'IceQuill': ['first_bar', 'bar_slinger', 'streak_starter'],
  'RhymeRebel': ['first_bar', 'rising_star', 'bar_adopter'],
  'MidnightMuse': ['first_bar', 'wordsmith', 'midnight_marauder', 'bar_slinger'],
  'ThunderVerb': ['first_bar', 'bar_slinger', 'thread_dominator'],
  'SilkSyntax': ['first_bar', 'wordsmith', 'streak_starter', 'bar_slinger'],
  'BronzeBard': ['first_bar', 'rising_star', 'og_member'],
  'EchoEthics': ['first_bar', 'bar_slinger', 'clean_streak'],
  'ViperVerse': ['first_bar', 'bar_slinger', 'viral', 'rising_star'],
  'CosmicCypher': ['first_bar', 'wordsmith', 'bar_slinger', 'streak_legend'],
  'SteelSonnet': ['first_bar', 'bar_slinger', 'reply_king'],
  'BlazeBallad': ['first_bar', 'rising_star', 'streak_starter'],
  'OnyxOracle': ['first_bar', 'wordsmith', 'bar_slinger'],
  'PrismPunchline': ['first_bar', 'bar_slinger', 'viral_bronze'],
  'QuantumQuotes': ['first_bar', 'rising_star', 'weekend_warrior'],
};

const fakeUsers = [
  { username: 'VelvetVenom', bio: 'Spitting flames since birth. West Coast vibes.', location: 'Los Angeles, CA', online: 'online' },
  { username: 'ShadowScribe', bio: 'Pen game elite. Poetry meets hip-hop.', location: 'Atlanta, GA', online: 'offline' },
  { username: 'NeonNinja', bio: 'Quick with the wordplay. Silent but deadly.', location: 'Tokyo, Japan', online: 'online' },
  { username: 'CrimsonCadence', bio: 'Blood runs hot, bars run cold.', location: 'Chicago, IL', online: 'away' },
  { username: 'PhantomPhrases', bio: 'You hear me before you see me.', location: 'Detroit, MI', online: 'online' },
  { username: 'GoldenTongue', bio: 'Every word is 24 karat.', location: 'Miami, FL', online: 'offline' },
  { username: 'IceQuill', bio: 'Cold delivery, hot content.', location: 'Minneapolis, MN', online: 'online' },
  { username: 'RhymeRebel', bio: 'Breaking rules, making moves.', location: 'Houston, TX', online: 'away' },
  { username: 'MidnightMuse', bio: 'Best bars come after dark.', location: 'New York, NY', online: 'online' },
  { username: 'ThunderVerb', bio: 'My words hit like lightning.', location: 'Denver, CO', online: 'offline' },
  { username: 'SilkSyntax', bio: 'Smooth flow, sharp mind.', location: 'Philadelphia, PA', online: 'online' },
  { username: 'BronzeBard', bio: 'Old soul, new school.', location: 'Nashville, TN', online: 'offline' },
  { username: 'EchoEthics', bio: 'Conscious rap. Real talk.', location: 'Oakland, CA', online: 'online' },
  { username: 'ViperVerse', bio: 'Strike fast, leave marks.', location: 'Phoenix, AZ', online: 'away' },
  { username: 'CosmicCypher', bio: 'Universal flow. Infinite bars.', location: 'Portland, OR', online: 'online' },
  { username: 'SteelSonnet', bio: 'Hard rhymes, soft heart.', location: 'Pittsburgh, PA', online: 'offline' },
  { username: 'BlazeBallad', bio: 'Fire bars, warm soul.', location: 'Austin, TX', online: 'online' },
  { username: 'OnyxOracle', bio: 'Dark wisdom, bright future.', location: 'Boston, MA', online: 'away' },
  { username: 'PrismPunchline', bio: 'Every bar hits different.', location: 'San Diego, CA', online: 'online' },
  { username: 'QuantumQuotes', bio: 'Exist in multiple states of fire.', location: 'Las Vegas, NV', online: 'offline' },
];

const fakeBars = [
  { content: "They say money talks but mine screams, cash flow loud like broken dreams, stacking green while others scheme.", category: "Freestyle", tags: ["money", "hustle"] },
  { content: "I flip words like pancakes on a Sunday morning, no warning when the heat starts forming.", category: "Punchline", tags: ["wordplay"] },
  { content: "Elevation is my destination, no hesitation, pure dedication to the lyrical nation.", category: "Freestyle", tags: ["motivation"] },
  { content: "Cold bars, warm heart, been this way from the start. Art imitates life but my life IS art.", category: "Freestyle", tags: ["deep"] },
  { content: "Pen hits paper like lightning strikes sand, glass sculptures from these rhymes so grand.", category: "Punchline", tags: ["creative"] },
  { content: "They sleeping on me like I'm a mattress, but I'm wide awake practicing this rap practice.", category: "Funny", tags: ["humor", "grind"] },
  { content: "Flow so smooth it should come with a warning label, mentally unstable when I'm spitting at the table.", category: "Freestyle", tags: ["flow"] },
  { content: "I write rhymes in dimensions you can't perceive, make believers out of those who don't believe.", category: "Punchline", tags: ["metaphysical"] },
  { content: "Bars so heavy they need their own zip code, every verse I spit is a heavy load.", category: "Freestyle", tags: ["bars"] },
  { content: "Mirror mirror on the wall, who got the coldest flow of all? Me, standing tall, never gonna fall.", category: "Freestyle", tags: ["confidence"] },
  { content: "I paint pictures with syllables, every word is biblical, my flow is lyrical, impact is physical.", category: "Punchline", tags: ["wordplay"] },
  { content: "Started from the notepad, now we here. Every bar crystal clear, no fear in my atmosphere.", category: "Freestyle", tags: ["journey"] },
  { content: "They want the smoke but can't handle the fire, my bars take you higher than a church choir.", category: "Punchline", tags: ["fire"] },
  { content: "Conscious mind, unconscious rhymes, wake up to these conscious times.", category: "Storytelling", tags: ["conscious"] },
  { content: "I bend words like Neo bends spoons, fill up rooms with lyrical monsoons.", category: "Punchline", tags: ["matrix", "wordplay"] },
  { content: "Late nights and early mornings, this is more than a hobby it's a calling.", category: "Freestyle", tags: ["dedication"] },
  { content: "Vocabulary vast like the ocean floor, every verse opens up another door.", category: "Freestyle", tags: ["vocabulary"] },
  { content: "I cook up heat in the booth like a chef, leave you breathless, gasping for breath.", category: "Punchline", tags: ["heat"] },
  { content: "Words are my weapon, the pen is my sword, every battle I've won, check the scoreboard.", category: "Freestyle", tags: ["battle"] },
  { content: "Ethereal flow, material glow, watch me grow while I steal the show.", category: "Freestyle", tags: ["growth"] },
  { content: "I architect bars like Frank Lloyd Wright, every structure tight, every line ignite.", category: "Punchline", tags: ["architecture"] },
  { content: "Midnight oil burning, always learning, for that number one spot I'm yearning.", category: "Freestyle", tags: ["grind"] },
  { content: "Complexity in simplicity, my bars got electricity, authenticity with no duplicity.", category: "Punchline", tags: ["real"] },
  { content: "Break bread with the real ones, steel drums, feel the rhythm when the beat comes.", category: "Freestyle", tags: ["loyalty"] },
  { content: "I levitate above the hate, meditate on being great, it's never too late.", category: "Freestyle", tags: ["positivity"] },
  { content: "Syllable assassin, passion never lacking, keep it cracking while they slacking.", category: "Punchline", tags: ["assassin"] },
  { content: "I write in cursive, every curve is purposive, making nervous, those who surface.", category: "Freestyle", tags: ["skill"] },
  { content: "Legends never die, they multiply, amplify, reach the sky, that's no lie.", category: "Freestyle", tags: ["legend"] },
  { content: "Verbal gymnastics, bars are fantastic, impact is drastic, flow elastic.", category: "Punchline", tags: ["flow"] },
  { content: "I'm the calm before the storm, break the norm, transform, keep it warm.", category: "Freestyle", tags: ["storm"] },
  { content: "Truth in every sentence, repentance for the senseless, my defense is relentless.", category: "Storytelling", tags: ["truth"] },
  { content: "Mic check one two, breakthrough, brand new, what I do, stay true.", category: "Freestyle", tags: ["authentic"] },
  { content: "Golden era mentality, brutal reality, my fatality is this musicality.", category: "Punchline", tags: ["90s"] },
  { content: "I plant seeds with every rhyme, harvest in due time, the grind is mine.", category: "Freestyle", tags: ["patience"] },
  { content: "Paper and pen therapy, my legacy, energy, synergy.", category: "Freestyle", tags: ["therapy"] },
  { content: "They mimicking my style but can't replicate the substance, abundance of reluctance from the redundant.", category: "Punchline", tags: ["original"] },
  { content: "Night owl hours, super powers, watch me devour, this is my hour.", category: "Freestyle", tags: ["night"] },
  { content: "I breathe bars like oxygen, toxins in, boxing them in, I'ma win.", category: "Punchline", tags: ["breathe"] },
  { content: "Elevated consciousness, confidence is obvious, metropolis anonymous.", category: "Freestyle", tags: ["woke"] },
  { content: "Every setback is a setup for a comeback, run that, one track, sun black.", category: "Freestyle", tags: ["comeback"] },
];

const beefComments = [
  { from: 'ViperVerse', to: 'ShadowScribe', comment: "Yo @ShadowScribe your last bar was weak, step up or step out" },
  { from: 'ShadowScribe', to: 'ViperVerse', comment: "@ViperVerse says the one recycling flows from 2010. Get creative or get gone." },
  { from: 'ViperVerse', to: 'ShadowScribe', comment: "At least my bars don't put people to sleep. Your stuff reads like a lullaby 😴" },
  { from: 'ShadowScribe', to: 'ViperVerse', comment: "A lullaby that's smoother than anything you've ever written. Stay in your lane." },
  { from: 'CrimsonCadence', to: 'ThunderVerb', comment: "@ThunderVerb you call that thunder? Sounds more like a light drizzle 🌧️" },
  { from: 'ThunderVerb', to: 'CrimsonCadence', comment: "Coming from someone named after a crayon color? Miss me with that." },
];

const positiveComments = [
  "This bar is absolutely fire! 🔥🔥🔥",
  "The wordplay here is insane, respect!",
  "Yo this hit different. Pure talent.",
  "Saved this one. Too cold 🥶",
  "The flow on this is crazy smooth",
  "This is why I love this platform. Bars like THIS.",
  "Underrated. This deserves way more attention.",
  "The metaphor game is strong here 💪",
  "Been playing this in my head all day",
  "How do you even think of stuff like this?",
  "Certified heat. No debate.",
  "This one's going in my notebook for inspiration",
  "The delivery would be insane on a beat",
  "Pure poetry. Hip-hop needs more of this.",
  "You snapped on this one fr fr",
];

function generateProofHash(content: string, timestamp: Date, userId: string, proofBarId: string): string {
  const data = `${content}|${timestamp.toISOString()}|${userId}|${proofBarId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function getNextProofBarId(): Promise<number> {
  const result = await db.select({ proofBarId: bars.proofBarId }).from(bars);
  let maxId = 0;
  for (const row of result) {
    if (row.proofBarId) {
      const num = parseInt(row.proofBarId.replace('orphanbars-#', ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    }
  }
  return maxId + 1;
}

async function seedFakeData() {
  console.log("Starting fake data seed...");
  
  const existingBars = await db.select().from(bars);
  const existingUsers = await db.select().from(users);
  console.log(`Found ${existingBars.length} existing bars and ${existingUsers.length} existing users`);

  const createdUserIds: string[] = [];
  
  for (const fakeUser of fakeUsers) {
    const existing = await db.select().from(users).where(eq(users.username, fakeUser.username));
    if (existing.length > 0) {
      console.log(`User ${fakeUser.username} already exists, skipping...`);
      createdUserIds.push(existing[0].id);
      continue;
    }
    
    const id = crypto.randomUUID();
    const xp = Math.floor(Math.random() * 500) + 200;
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    
    await db.insert(users).values({
      id,
      username: fakeUser.username,
      password: 'fakepassword_' + crypto.randomBytes(8).toString('hex'),
      email: `${fakeUser.username.toLowerCase()}@fake.orphanbars.local`,
      bio: fakeUser.bio,
      location: fakeUser.location,
      emailVerified: true,
      xp,
      level,
      membershipTier: 'free',
      isAdmin: false,
      onlineStatus: fakeUser.online,
      lastSeenAt: fakeUser.online === 'online' ? new Date() : new Date(Date.now() - Math.random() * 86400000),
    });
    
    createdUserIds.push(id);
    console.log(`Created user: ${fakeUser.username}`);
  }

  let proofBarIdCounter = await getNextProofBarId();
  const createdBarIds: string[] = [];
  
  const shuffledBars = [...fakeBars].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledBars.length; i++) {
    const fakeBar = shuffledBars[i];
    const userId = createdUserIds[i % createdUserIds.length];
    const barId = crypto.randomUUID();
    const proofBarId = `orphanbars-#${String(proofBarIdCounter).padStart(5, '0')}`;
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const proofHash = generateProofHash(fakeBar.content, createdAt, userId, proofBarId);
    
    await db.insert(bars).values({
      id: barId,
      userId,
      content: fakeBar.content,
      category: fakeBar.category,
      tags: fakeBar.tags,
      isOriginal: true,
      proofBarId,
      proofHash,
      permissionStatus: Math.random() > 0.7 ? 'open_adopt' : 'share_only',
      moderationStatus: 'approved',
      barType: 'single_bar',
      isLocked: Math.random() > 0.5,
      lockedAt: Math.random() > 0.5 ? new Date() : null,
    });
    
    createdBarIds.push(barId);
    proofBarIdCounter++;
  }
  console.log(`Created ${createdBarIds.length} new bars`);

  const allBarIds = [...existingBars.map(b => b.id), ...createdBarIds];
  const allUserIds = [...existingUsers.map(u => u.id), ...createdUserIds];
  
  let likesAdded = 0;
  for (const barId of allBarIds) {
    const bar = existingBars.find(b => b.id === barId) || { userId: createdUserIds[0] };
    const numLikes = Math.floor(Math.random() * 8) + 2;
    const likers = allUserIds.filter(id => id !== bar.userId).sort(() => Math.random() - 0.5).slice(0, numLikes);
    
    for (const likerId of likers) {
      try {
        await db.insert(likes).values({
          id: crypto.randomUUID(),
          barId,
          userId: likerId,
        });
        likesAdded++;
      } catch (e) {}
    }
  }
  console.log(`Added ${likesAdded} likes`);

  let dislikesAdded = 0;
  for (const barId of allBarIds.slice(0, 10)) {
    const bar = existingBars.find(b => b.id === barId) || { userId: createdUserIds[0] };
    const numDislikes = Math.floor(Math.random() * 2);
    const dislikers = allUserIds.filter(id => id !== bar.userId).sort(() => Math.random() - 0.5).slice(0, numDislikes);
    
    for (const dislikerId of dislikers) {
      try {
        await db.insert(dislikes).values({
          id: crypto.randomUUID(),
          barId,
          userId: dislikerId,
        });
        dislikesAdded++;
      } catch (e) {}
    }
  }
  console.log(`Added ${dislikesAdded} dislikes`);

  let commentsAdded = 0;
  for (const barId of allBarIds) {
    const bar = existingBars.find(b => b.id === barId) || { userId: createdUserIds[0] };
    const numComments = Math.floor(Math.random() * 4);
    const commenters = allUserIds.filter(id => id !== bar.userId).sort(() => Math.random() - 0.5).slice(0, numComments);
    
    for (const commenterId of commenters) {
      const comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
      try {
        await db.insert(comments).values({
          id: crypto.randomUUID(),
          barId,
          userId: commenterId,
          content: comment,
        });
        commentsAdded++;
      } catch (e) {}
    }
  }
  console.log(`Added ${commentsAdded} positive comments`);

  const userMap = new Map<string, string>();
  for (const fakeUser of fakeUsers) {
    const user = await db.select().from(users).where(eq(users.username, fakeUser.username));
    if (user.length > 0) userMap.set(fakeUser.username, user[0].id);
  }
  
  let beefCommentsAdded = 0;
  for (const beef of beefComments) {
    const fromUserId = userMap.get(beef.from);
    const toUserId = userMap.get(beef.to);
    if (!fromUserId || !toUserId) continue;
    
    const toUserBars = await db.select().from(bars).where(eq(bars.userId, toUserId));
    if (toUserBars.length === 0) continue;
    
    const targetBar = toUserBars[Math.floor(Math.random() * toUserBars.length)];
    try {
      await db.insert(comments).values({
        id: crypto.randomUUID(),
        barId: targetBar.id,
        userId: fromUserId,
        content: beef.comment,
      });
      beefCommentsAdded++;
    } catch (e) {}
  }
  console.log(`Added ${beefCommentsAdded} beef comments`);

  let followsAdded = 0;
  for (const followerId of allUserIds) {
    const numFollowing = Math.floor(Math.random() * 10) + 3;
    const toFollow = allUserIds.filter(id => id !== followerId).sort(() => Math.random() - 0.5).slice(0, numFollowing);
    
    for (const followingId of toFollow) {
      try {
        await db.insert(follows).values({
          id: crypto.randomUUID(),
          followerId,
          followingId,
        });
        followsAdded++;
      } catch (e) {}
    }
  }
  console.log(`Added ${followsAdded} follows`);

  // Seed achievements for demo users
  console.log("\nSeeding achievements for demo users...");
  let achievementsAdded = 0;
  
  for (const fakeUser of fakeUsers) {
    const achievements = achievementAssignments[fakeUser.username];
    if (!achievements) continue;
    
    const userRecord = await db.select().from(users).where(eq(users.username, fakeUser.username));
    if (userRecord.length === 0) continue;
    
    const userId = userRecord[0].id;
    
    for (const achievementId of achievements) {
      try {
        await db.insert(userAchievements).values({
          id: crypto.randomUUID(),
          userId,
          achievementId,
          unlockedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        }).onConflictDoNothing();
        achievementsAdded++;
      } catch (e) {}
    }
    
    // Set displayed badges for this user (first 2 achievements)
    const displayedBadges = achievements.slice(0, 2);
    try {
      await db.update(users)
        .set({ displayedBadges })
        .where(eq(users.id, userId));
    } catch (e) {}
  }
  console.log(`Added ${achievementsAdded} achievements`);

  console.log("\n✅ Fake data seed complete!");
  console.log(`- ${createdUserIds.length} users (some may have existed)`);
  console.log(`- ${createdBarIds.length} new bars`);
  console.log(`- ${likesAdded} likes`);
  console.log(`- ${dislikesAdded} dislikes`);
  console.log(`- ${commentsAdded + beefCommentsAdded} comments`);
  console.log(`- ${followsAdded} follows`);
  console.log(`- ${achievementsAdded} achievements`);
}

seedFakeData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
