import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { testDatabaseConnection } from "./db";
import fs from "fs";
import path from "path";
import { Logtail } from "@logtail/node";

const app = express();
const httpServer = createServer(app);

// BetterStack Logs (Logtail) — set BETTERSTACK_SOURCE_TOKEN in your environment
const logtail = process.env.BETTERSTACK_SOURCE_TOKEN
  ? new Logtail(process.env.BETTERSTACK_SOURCE_TOKEN)
  : null;

// Trust proxy for production (required for secure cookies behind Replit's proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);

  // Send to BetterStack Logs
  if (logtail) {
    logtail.info(message, { source });
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// OG meta tag middleware for social media previews
async function ogMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only intercept HTML requests for bar and profile pages
  if (!req.accepts('html') || req.path.startsWith('/api')) {
    return next();
  }

  const barMatch = req.path.match(/^\/bars\/([^/]+)$/);
  const profileMatch = req.path.match(/^\/u\/([^/]+)$/);

  if (!barMatch && !profileMatch) {
    return next();
  }

  try {
    let title = "Orphan Bars";
    let description = "Share your bars, one-liners, punchlines, and entendres";
    let url = `https://orphanbars.space${req.path}`;

    if (barMatch) {
      const barId = barMatch[1];
      const bar = await storage.getBarById(barId);
      if (bar) {
        const truncatedContent = bar.content.length > 150 
          ? bar.content.substring(0, 150) + "..." 
          : bar.content;
        title = `Bar by @${bar.user.username} - Orphan Bars`;
        description = truncatedContent.replace(/<[^>]*>/g, ''); // Strip HTML tags
      }
    } else if (profileMatch) {
      const username = profileMatch[1];
      const user = await storage.getUserByUsername(username);
      if (user) {
        title = `@${user.username} on Orphan Bars`;
        description = user.bio || `Check out @${user.username}'s bars on Orphan Bars`;
      }
    }

    // Read the HTML template and inject OG tags
    const htmlPath = process.env.NODE_ENV === "production" 
      ? path.join(process.cwd(), "dist", "public", "index.html")
      : path.join(process.cwd(), "client", "index.html");
    
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, "utf-8");
      
      // Replace existing OG tags with dynamic ones
      html = html.replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`);
      html = html.replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description}"`);
      html = html.replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`);
      html = html.replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`);
      html = html.replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${description}"`);
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
      
      return res.send(html);
    }
  } catch (error) {
    log(`OG middleware error: ${error}`);
  }
  
  next();
}

async function startServer() {
  try {
    log("Starting server initialization...");
    
    // Check required environment variables
    const hasDatabase = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!hasDatabase) {
      log(`Warning: No database URL configured. Set SUPABASE_DATABASE_URL or DATABASE_URL.`);
    }
    if (!process.env.SESSION_SECRET) {
      log(`Warning: Missing SESSION_SECRET environment variable.`);
    }
    
    // Test database connection
    log("Testing database connection...");
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      log("Warning: Database connection failed, but continuing startup...");
    }
    
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      // Send errors to BetterStack as error-level logs
      if (logtail) {
        logtail.error(message, { status, stack: err.stack });
      }
      res.status(status).json({ message });
    });

    // Add OG middleware before static file serving
    app.use(ogMiddleware);

    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...");
      serveStatic(app);
    } else {
      log("Setting up Vite for development...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`Server is ready and listening on port ${port}`);
      },
    );
  } catch (error) {
    log(`Fatal error during startup: ${error}`);
    console.error("Startup error:", error);
    if (logtail) {
      await logtail.error(`Fatal error during startup: ${error}`);
      await logtail.flush();
    }
    process.exit(1);
  }
}

// Flush logs on shutdown
process.on("SIGTERM", async () => {
  if (logtail) await logtail.flush();
  process.exit(0);
});
process.on("SIGINT", async () => {
  if (logtail) await logtail.flush();
  process.exit(0);
});

startServer();
