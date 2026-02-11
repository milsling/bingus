import { db } from "./db";
import { bars } from "@shared/schema";
import { count } from "drizzle-orm";

async function testDb() {
  try {
    console.log("Testing database connection...");
    
    const result = await db.select({ count: count() }).from(bars);
    console.log("Total bars in DB:", result[0]?.count || 0);
    
    const locked = await db.select({ count: count() }).from(bars).where({ isLocked: true });
    console.log("Locked bars:", locked[0]?.count || 0);
    
  } catch (error) {
    console.error("DB test failed:", error);
  }
}

testDb();
