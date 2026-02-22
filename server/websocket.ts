import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { Request } from "express";
import { log } from "./index";

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts[0]?.trim();
    const value = parts.slice(1).join('=').trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  username?: string;
  isAlive: boolean;
}

interface MessageBatch {
  type: string;
  messages: any[];
}

const clients = new Map<string, Set<AuthenticatedSocket>>();
const messageQueues = new Map<string, any[]>();

const BATCH_INTERVAL = 200;

export function setupWebSocket(server: Server, sessionParser: any) {
  const wss = new WebSocketServer({ noServer: true });

  setInterval(() => {
    Array.from(messageQueues.entries()).forEach(([userId, queue]) => {
      if (queue.length > 0) {
        const userClients = clients.get(userId);
        if (userClients) {
          const batch: MessageBatch = {
            type: "batchMessages",
            messages: [...queue],
          };
          const payload = JSON.stringify(batch);
          Array.from(userClients).forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(payload);
            }
          });
        }
        messageQueues.set(userId, []);
      }
    });
  }, BATCH_INTERVAL);

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as AuthenticatedSocket;
      if (!socket.isAlive) {
        removeClient(socket);
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", (ws: AuthenticatedSocket, req) => {
    ws.isAlive = true;

    const cookies = parseCookies(req.headers.cookie || "");
    const sessionId = cookies["connect.sid"];

    if (!sessionId) {
      ws.close(4001, "No session");
      return;
    }

    const mockReq = { headers: { cookie: req.headers.cookie }, url: req.url || '/' } as Request;
    const mockRes = {} as any;

    sessionParser(mockReq, mockRes, () => {
      const session = (mockReq as any).session;
      if (!session?.passport?.user) {
        ws.close(4002, "Not authenticated");
        return;
      }

      ws.userId = session.passport.user;
      ws.username = session.passport.username;

      if (!clients.has(ws.userId!)) {
        clients.set(ws.userId!, new Set());
      }
      clients.get(ws.userId!)!.add(ws);

      if (!messageQueues.has(ws.userId!)) {
        messageQueues.set(ws.userId!, []);
      }

      log(`WebSocket connected: user ${ws.userId}`);

      ws.send(JSON.stringify({ type: "connected", userId: ws.userId }));
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        log(`WebSocket message parse error: ${error}`);
      }
    });

    ws.on("close", () => {
      removeClient(ws);
      log(`WebSocket disconnected: user ${ws.userId}`);
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error}`);
      removeClient(ws);
    });
  });

  return { wss, sessionParser };
}

function removeClient(ws: AuthenticatedSocket) {
  if (ws.userId) {
    const userClients = clients.get(ws.userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        clients.delete(ws.userId);
        messageQueues.delete(ws.userId);
      }
    }
  }
}

function handleMessage(ws: AuthenticatedSocket, message: any) {
  switch (message.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong" }));
      break;
    case "typing":
      notifyUser(message.receiverId, {
        type: "typing",
        senderId: ws.userId,
        senderUsername: ws.username,
      });
      break;
    default:
      break;
  }
}

export function notifyUser(userId: string, data: any) {
  const queue = messageQueues.get(userId);
  if (queue) {
    queue.push(data);
  } else {
    const userClients = clients.get(userId);
    if (userClients) {
      const payload = JSON.stringify(data);
      Array.from(userClients).forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }
}

export function notifyNewMessage(receiverId: string, message: any) {
  notifyUser(receiverId, {
    type: "newMessage",
    message,
  });
}

export function isUserOnline(userId: string): boolean {
  const userClients = clients.get(userId);
  return userClients ? userClients.size > 0 : false;
}

export function getOnlineUserIds(): string[] {
  return Array.from(clients.keys());
}
