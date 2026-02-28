import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  console.log("🧹 Cleaning dist directory...");
  await rm("dist", { recursive: true, force: true });

  console.log("🎨 Building client with Vite...");
  try {
    await viteBuild();
    console.log("✅ Client build successful");
  } catch (error) {
    console.error("❌ Client build failed:", error);
    throw error;
  }

  console.log("⚙️  Building server with esbuild...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));
  console.log(`📦 Externalizing ${externals.length} dependencies`);

  try {
    await esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
    });
    console.log("✅ Server build successful");
  } catch (error) {
    console.error("❌ Server build failed:", error);
    throw error;
  }
  
  console.log("🎉 Build completed successfully!");
}

buildAll().catch((err) => {
  console.error("❌ BUILD FAILED:");
  console.error(err);
  if (err instanceof Error) {
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
  }
  process.stderr.write(`\nBuild failed with error: ${err}\n`);
  process.exit(1);
});
