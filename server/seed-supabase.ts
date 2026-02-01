import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';

const pool = new Pool({ 
  connectionString: process.env.SUPABASE_DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

const fakeUsers = [
  { username: 'VelvetVenom', bio: 'Spitting flames since birth. West Coast vibes.', location: 'Los Angeles, CA' },
  { username: 'ShadowScribe', bio: 'Pen game elite. Poetry meets hip-hop.', location: 'Atlanta, GA' },
  { username: 'NeonNinja', bio: 'Quick with the wordplay. Silent but deadly.', location: 'Tokyo, Japan' },
  { username: 'CrimsonCadence', bio: 'Blood runs hot, bars run cold.', location: 'Chicago, IL' },
  { username: 'PhantomPhrases', bio: 'You hear me before you see me.', location: 'Detroit, MI' },
  { username: 'GoldenTongue', bio: 'Every word is 24 karat.', location: 'Miami, FL' },
  { username: 'IceQuill', bio: 'Cold delivery, hot content.', location: 'Minneapolis, MN' },
  { username: 'RhymeRebel', bio: 'Breaking rules, making moves.', location: 'Houston, TX' },
  { username: 'MidnightMuse', bio: 'Best bars come after dark.', location: 'New York, NY' },
  { username: 'ThunderVerb', bio: 'My words hit like lightning.', location: 'Denver, CO' },
  { username: 'SilkSyntax', bio: 'Smooth flow, sharp mind.', location: 'Philadelphia, PA' },
  { username: 'BronzeBard', bio: 'Old soul, new school.', location: 'Nashville, TN' },
  { username: 'EchoEthics', bio: 'Conscious rap. Real talk.', location: 'Oakland, CA' },
  { username: 'ViperVerse', bio: 'Strike fast, leave marks.', location: 'Phoenix, AZ' },
  { username: 'CosmicCypher', bio: 'Universal flow. Infinite bars.', location: 'Portland, OR' },
  { username: 'SteelSonnet', bio: 'Hard rhymes, soft heart.', location: 'Pittsburgh, PA' },
  { username: 'BlazeBallad', bio: 'Fire bars, warm soul.', location: 'Austin, TX' },
  { username: 'OnyxOracle', bio: 'Dark wisdom, bright future.', location: 'Boston, MA' },
  { username: 'PrismPunchline', bio: 'Every bar hits different.', location: 'San Diego, CA' },
  { username: 'QuantumQuotes', bio: 'Exist in multiple states of fire.', location: 'Las Vegas, NV' },
  { username: 'Milsling', bio: 'Creator of orphanbars.com!', location: 'Seattle, WA' },
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
  { content: "Born to break the mold, my story's yet untold, trading silver tongues for solid gold.", category: "Storytelling", tags: ["journey"] },
  { content: "Syllable assassin, passion never lacking, keep it cracking while they slacking.", category: "Punchline", tags: ["assassin"] },
  { content: "I'm the calm before the storm, break the norm, transform, keep it warm.", category: "Freestyle", tags: ["storm"] },
  { content: "Truth in every sentence, repentance for the senseless, my defense is relentless.", category: "Storytelling", tags: ["truth"] },
  { content: "They mimicking my style but can't replicate the substance, abundance of reluctance from the redundant.", category: "Punchline", tags: ["original"] },
  { content: "Late nights and early mornings, this is more than a hobby it's a calling.", category: "Freestyle", tags: ["dedication"] },
  { content: "Complexity in simplicity, my bars got electricity, authenticity with no duplicity.", category: "Punchline", tags: ["real"] },
  { content: "Night owl hours, super powers, watch me devour, this is my hour.", category: "Freestyle", tags: ["night"] },
  { content: "I architect bars like Frank Lloyd Wright, every structure tight, every line ignite.", category: "Punchline", tags: ["architecture"] },
  { content: "I paint pictures with syllables, every word is biblical, my flow is lyrical, impact is physical.", category: "Punchline", tags: ["wordplay"] },
  { content: "I cook up heat in the booth like a chef, leave you breathless, gasping for breath.", category: "Punchline", tags: ["heat"] },
  { content: "Mic check one two, breakthrough, brand new, what I do, stay true.", category: "Freestyle", tags: ["authentic"] },
  { content: "Vocabulary vast like the ocean floor, every verse opens up another door.", category: "Freestyle", tags: ["vocabulary"] },
  { content: "Started from the notepad, now we here. Every bar crystal clear, no fear in my atmosphere.", category: "Freestyle", tags: ["journey"] },
  { content: "Verbal gymnastics, bars are fantastic, impact is drastic, flow elastic.", category: "Punchline", tags: ["flow"] },
  { content: "Mirror mirror on the wall, who got the coldest flow of all? Me, standing tall, never gonna fall.", category: "Freestyle", tags: ["confidence"] },
  { content: "Every setback is a setup for a comeback, run that, one track, sun black.", category: "Freestyle", tags: ["comeback"] },
  { content: "I bend words like Neo bends spoons, fill up rooms with lyrical monsoons.", category: "Punchline", tags: ["matrix", "wordplay"] },
  { content: "Street scholar, white collar, blue collar, all dollar, never holler, always follow the proper parlor.", category: "Freestyle", tags: ["hustle"] },
  { content: "My pen weeps ink tears on paper cheeks, speaking for the meek, unique technique.", category: "Storytelling", tags: ["emotion"] },
  { content: "Dropping bombs like B-52s, breaking news, paying dues, never lose, always choose to amuse.", category: "Freestyle", tags: ["bars"] },
  { content: "Lyrical locksmith, unlock hits, rock splits, watch this, non-stop bliss.", category: "Punchline", tags: ["locksmith"] },
];

const positiveComments = [
  "This hits different 🔥",
  "Bars for days! Keep dropping heat",
  "The wordplay here is insane",
  "Flow is immaculate fr",
  "This needs to be on a track ASAP",
  "Underrated bar right here",
  "The imagery in this is crazy",
  "Saved this one. Pure fire",
  "You snapped on this one",
  "This is why I love this app",
  "Metaphors on point 💯",
  "The delivery though... sheesh",
  "Taking notes 📝",
  "This should be in a cipher",
  "Hard bars, no cap",
];

function generateProofHash(content: string, timestamp: Date, odiaId: string, proofBarId: string): string {
  const data = `${content}|${timestamp.toISOString()}|${odiaId}|${proofBarId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function seedSupabase() {
  console.log('Starting Supabase seed...\n');
  
  const userIds: string[] = [];
  
  console.log('Creating/verifying users...');
  for (const user of fakeUsers) {
    const result = await pool.query(
      `INSERT INTO users (id, username, email, password, email_verified, bio, location, avatar_url, xp, level, is_admin, is_owner)
       VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5, $6, 100, 2, $7, $8)
       ON CONFLICT (username) DO UPDATE SET username = users.username
       RETURNING id`,
      [
        user.username, 
        user.username.toLowerCase() + '@fake.orphanbars.local', 
        'fakehash', 
        user.bio, 
        user.location, 
        '/avatars/' + user.username.toLowerCase() + '.png',
        user.username === 'Milsling',
        user.username === 'Milsling'
      ]
    );
    userIds.push(result.rows[0].id);
  }
  console.log(`Users ready: ${userIds.length}`);

  let barSequence = 1;
  const barIds: string[] = [];
  const barUserMap: Record<string, string> = {};
  
  console.log('\nCreating bars...');
  for (const bar of fakeBars) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const proofBarId = `orphanbars-#${String(barSequence).padStart(5, '0')}`;
    const proofHash = generateProofHash(bar.content, createdAt, userId, proofBarId);
    const isLocked = Math.random() > 0.5;
    
    const result = await pool.query(
      `INSERT INTO bars (id, user_id, content, category, tags, feedback_wanted, is_original, created_at, proof_bar_id, proof_hash, permission_status, is_locked, locked_at, moderation_status)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, true, $5, $6, $7, $8, $9, $10, 'approved')
       RETURNING id`,
      [
        userId,
        bar.content,
        bar.category,
        bar.tags,
        createdAt,
        proofBarId,
        proofHash,
        Math.random() > 0.5 ? 'open_adopt' : 'share_only',
        isLocked,
        isLocked ? createdAt : null
      ]
    );
    barIds.push(result.rows[0].id);
    barUserMap[result.rows[0].id] = userId;
    barSequence++;
  }
  console.log(`Bars created: ${barIds.length}`);

  console.log('\nCreating likes...');
  let likesAdded = 0;
  for (const barId of barIds) {
    const numLikes = Math.floor(Math.random() * 15) + 2;
    const likers = userIds.filter(id => id !== barUserMap[barId]).sort(() => Math.random() - 0.5).slice(0, numLikes);
    
    for (const odiaId of likers) {
      try {
        await pool.query(
          `INSERT INTO likes (id, user_id, bar_id) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT DO NOTHING`,
          [odiaId, barId]
        );
        likesAdded++;
      } catch (e) {}
    }
  }
  console.log(`Likes added: ${likesAdded}`);

  console.log('\nCreating comments...');
  let commentsAdded = 0;
  for (const barId of barIds) {
    const numComments = Math.floor(Math.random() * 5);
    const commenters = userIds.filter(id => id !== barUserMap[barId]).sort(() => Math.random() - 0.5).slice(0, numComments);
    
    for (const commenterId of commenters) {
      const comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
      try {
        await pool.query(
          `INSERT INTO comments (id, user_id, bar_id, content) VALUES (gen_random_uuid(), $1, $2, $3)`,
          [commenterId, barId, comment]
        );
        commentsAdded++;
      } catch (e) {}
    }
  }
  console.log(`Comments added: ${commentsAdded}`);

  console.log('\nCreating follows...');
  let followsAdded = 0;
  for (const followerId of userIds) {
    const numFollowing = Math.floor(Math.random() * 10) + 3;
    const toFollow = userIds.filter(id => id !== followerId).sort(() => Math.random() - 0.5).slice(0, numFollowing);
    
    for (const followingId of toFollow) {
      try {
        await pool.query(
          `INSERT INTO follows (id, follower_id, following_id, status) VALUES (gen_random_uuid(), $1, $2, 'accepted') ON CONFLICT DO NOTHING`,
          [followerId, followingId]
        );
        followsAdded++;
      } catch (e) {}
    }
  }
  console.log(`Follows added: ${followsAdded}`);

  await pool.query(`INSERT INTO bar_sequence (id, last_value) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET last_value = $1`, [barSequence]);
  
  console.log('\n=== SUPABASE SEED COMPLETE ===');
  console.log(`Users: ${userIds.length}`);
  console.log(`Bars: ${barIds.length}`);
  console.log(`Likes: ${likesAdded}`);
  console.log(`Comments: ${commentsAdded}`);
  console.log(`Follows: ${followsAdded}`);
}

seedSupabase()
  .then(() => {
    console.log('\nDone!');
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    pool.end();
    process.exit(1);
  });
