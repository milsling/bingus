import type { Express, Request, Response } from "express";

export function registerImageRoutes(app: Express): void {
  app.post("/api/generate-image", async (req: Request, res: Response) => {
    return res.status(404).json({ error: "Not found" });
  });
}

