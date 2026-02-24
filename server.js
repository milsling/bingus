import express from 'express';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { RoomServiceClient, Room } from 'livekit-server-sdk';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'backgrounds');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `bg-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// LiveKit client
const livekitClient = new RoomServiceClient(
  process.env.LIVEKIT_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

// Store active connections
const connections = new Map();

// xAI Grok WebSocket connection
class GrokVoiceAgent {
  constructor(roomName, userId) {
    this.roomName = roomName;
    this.userId = userId;
    this.ws = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.ws = new WebSocket('wss://api.x.ai/v1/realtime');
      
      this.ws.on('open', () => {
        console.log(`[${new Date().toISOString()}] Connected to xAI Grok for room ${this.roomName}`);
        this.isConnected = true;
        this.sendConfig();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });

      this.ws.on('error', (error) => {
        console.error(`[${new Date().toISOString()}] xAI WebSocket error:`, error);
        this.reconnect();
      });

      this.ws.on('close', () => {
        console.log(`[${new Date().toISOString()}] xAI WebSocket closed`);
        this.isConnected = false;
        this.reconnect();
      });

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to connect to xAI:`, error);
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  sendConfig() {
    const config = {
      type: 'config',
      voice: 'ara',
      language: 'en',
      temperature: 0.7,
      max_tokens: 1000,
      turn_detection: {
        type: 'auto',
        silence_duration: 800
      }
    };
    this.ws.send(JSON.stringify(config));
  }

  handleMessage(message) {
    const connection = connections.get(this.roomName);
    if (!connection) return;

    switch (message.type) {
      case 'audio':
        // Forward audio back to browser
        if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({
            type: 'audio',
            audio: message.audio,
            transcript: message.transcript
          }));
        }
        break;
      
      case 'transcript':
        // Update transcript display
        if (connection.ws && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({
            type: 'transcript',
            text: message.text,
            isFinal: message.is_final
          }));
        }
        break;

      case 'error':
        console.error(`[${new Date().toISOString()}] xAI error:`, message.error);
        break;
    }
  }

  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isConnected) {
      this.ws.send(JSON.stringify({
        type: 'audio',
        audio: audioData
      }));
    }
  }

  reconnect() {
    if (this.isConnected) return;
    
    console.log(`[${new Date().toISOString()}] Reconnecting to xAI...`);
    setTimeout(() => {
      this.connect();
    }, 3000);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const roomId = uuidv4();
  const roomName = `voice-chat-${roomId}`;
  
  console.log(`[${new Date().toISOString()}] New connection: ${roomName}`);

  // Create LiveKit room
  livekitClient.createRoom({
    name: roomName,
    emptyTimeout: 300, // 5 minutes
    maxParticipants: 2
  }).then(room => {
    console.log(`[${new Date().toISOString()}] Created LiveKit room: ${room.name}`);
  }).catch(error => {
    console.error(`[${new Date().toISOString()}] Failed to create LiveKit room:`, error);
  });

  // Initialize Grok agent
  const grokAgent = new GrokVoiceAgent(roomName, roomId);
  grokAgent.connect();

  // Store connection
  connections.set(roomName, {
    ws,
    roomName,
    roomId,
    grokAgent,
    startTime: Date.now()
  });

  // Send initial connection info
  ws.send(JSON.stringify({
    type: 'connected',
    roomName,
    liveKitUrl: process.env.LIVEKIT_URL,
    liveKitApiKey: process.env.LIVEKIT_API_KEY,
    liveKitToken: null // Will be generated when needed
  }));

  // Handle messages from browser
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'audio':
          grokAgent.sendAudio(message.audio);
          break;
        
        case 'text':
          // Handle special trigger
          if (message.text.toLowerCase().includes('honk my titty')) {
            grokAgent.sendAudio('honk_trigger');
          }
          break;
        
        case 'disconnect':
          cleanup(roomName);
          break;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error handling message:`, error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Connection closed: ${roomName}`);
    cleanup(roomName);
  });

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, error);
    cleanup(roomName);
  });
});

// Cleanup function
function cleanup(roomName) {
  const connection = connections.get(roomName);
  if (connection) {
    connection.grokAgent.disconnect();
    
    // Delete LiveKit room
    livekitClient.deleteRoom(roomName).catch(error => {
      console.error(`[${new Date().toISOString()}] Failed to delete LiveKit room:`, error);
    });
    
    connections.delete(roomName);
    console.log(`[${new Date().toISOString()}] Cleaned up connection: ${roomName}`);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Shutting down gracefully...`);
  
  connections.forEach((connection, roomName) => {
    cleanup(roomName);
  });
  
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    process.exit(0);
  });
});

// Serve static files
app.use(express.static('public'));

// File upload endpoints
app.post('/api/upload/background', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/backgrounds/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete background endpoint
app.delete('/api/upload/background', (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // Extract filename from URL
    const filename = path.basename(url);
    const filePath = path.join(uploadsDir, filename);
    
    // Check if file exists and delete it
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Background deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Get list of uploaded backgrounds
app.get('/api/upload/backgrounds', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => ({
        filename: file,
        url: `/uploads/backgrounds/${file}`,
        size: fs.statSync(path.join(uploadsDir, file)).size,
        uploadedAt: fs.statSync(path.join(uploadsDir, file)).birthtime
      }))
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    res.json({ success: true, files });
  } catch (error) {
    console.error('List backgrounds error:', error);
    res.status(500).json({ error: 'Failed to list backgrounds' });
  }
});

// Theme management endpoints
const themesDir = path.join(process.cwd(), 'data', 'themes');
if (!fs.existsSync(themesDir)) {
  fs.mkdirSync(themesDir, { recursive: true });
}

// Get global themes
app.get('/api/themes/global', (req, res) => {
  try {
    const themesFile = path.join(themesDir, 'global-themes.json');
    if (fs.existsSync(themesFile)) {
      const themesData = fs.readFileSync(themesFile, 'utf8');
      const themes = JSON.parse(themesData);
      res.json(themes);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to load global themes:', error);
    res.status(500).json({ error: 'Failed to load global themes' });
  }
});

// Save global theme
app.post('/api/themes/global', (req, res) => {
  try {
    const themeData = req.body;
    
    // Validate theme data
    if (!themeData.id || !themeData.name || !themeData.settings) {
      return res.status(400).json({ error: 'Invalid theme data' });
    }

    const themesFile = path.join(themesDir, 'global-themes.json');
    let themes = [];
    
    if (fs.existsSync(themesFile)) {
      themes = JSON.parse(fs.readFileSync(themesFile, 'utf8'));
    }

    // Add or update theme
    const existingIndex = themes.findIndex(t => t.id === themeData.id);
    if (existingIndex >= 0) {
      themes[existingIndex] = { ...themeData, updatedAt: new Date().toISOString() };
    } else {
      themes.push({ ...themeData, createdAt: new Date().toISOString() });
    }

    fs.writeFileSync(themesFile, JSON.stringify(themes, null, 2));
    res.json({ success: true, theme: themeData });
  } catch (error) {
    console.error('Failed to save global theme:', error);
    res.status(500).json({ error: 'Failed to save global theme' });
  }
});

// Delete global theme
app.delete('/api/themes/global/:id', (req, res) => {
  try {
    const { id } = req.params;
    const themesFile = path.join(themesDir, 'global-themes.json');
    
    if (!fs.existsSync(themesFile)) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    let themes = JSON.parse(fs.readFileSync(themesFile, 'utf8'));
    const filteredThemes = themes.filter(t => t.id !== id);
    
    if (themes.length === filteredThemes.length) {
      return res.status(404).json({ error: 'Theme not found' });
    }

    fs.writeFileSync(themesFile, JSON.stringify(filteredThemes, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete global theme:', error);
    res.status(500).json({ error: 'Failed to delete global theme' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    connections: connections.size,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Voice chat server running on port ${PORT}`);
  console.log(`[${new Date().toISOString()}] Open http://localhost:${PORT} to start chatting`);
});
