#!/bin/bash

echo "🎤 Installing OrphanBars Voice Chat Dependencies..."

# Install additional dependencies for voice chat
npm install livekit-server-sdk@0.5.23 @livekit/agents@0.5.0 uuid@9.0.1

# Install dev dependencies
npm install -D @types/uuid@9.0.8

echo "✅ Dependencies installed!"
echo ""
echo "📋 Setup Instructions:"
echo "1. Copy .env.voice-chat to .env and fill in your API keys:"
echo "   - XAI_API_KEY: Get from https://console.x.ai/"
echo "   - LIVEKIT_URL: Your LiveKit cloud URL (wss://project.livekit.cloud)"
echo "   - LIVEKIT_API_KEY: Your LiveKit API key"
echo "   - LIVEKIT_API_SECRET: Your LiveKit API secret"
echo ""
echo "2. Start the server:"
echo "   node server.js"
echo ""
echo "3. Open http://localhost:3000"
echo ""
echo "🔥 Special trigger: Say 'honk my titty' for a surprise!"
