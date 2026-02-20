# OrphanBars Voice Chat with xAI Grok

A complete standalone Node.js voice chat application that adds real-time voice conversation to orphanbars.space using xAI Grok Voice Agent API.

## Features

- 🎤 **Real-time Voice Chat**: Talk into your mic, Grok listens and responds instantly
- 🤖 **xAI Grok Integration**: Uses Grok 'ara' voice (unhinged, vulgar, emotional)
- 🌐 **LiveKit WebRTC**: Ultra-low latency audio streaming (<800ms)
- 🎨 **Dark Theme UI**: Monospace font, green terminal aesthetic
- 🔥 **Special Trigger**: Say "honk my titty" for a surprise response
- 📱 **Mobile Responsive**: Works on desktop and mobile
- 🔄 **Auto-reconnect**: Handles disconnections gracefully

## Quick Setup

1. **Install Dependencies**
   ```bash
   ./install-voice-chat.sh
   ```

2. **Configure Environment**
   ```bash
   cp .env.voice-chat .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   XAI_API_KEY=your_xai_api_key_here
   LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
   LIVEKIT_API_KEY=your_livekit_api_key
   LIVEKIT_API_SECRET=your_livekit_api_secret
   ```

3. **Start Server**
   ```bash
   node server.js
   ```

4. **Open Browser**
   Navigate to http://localhost:3000

## API Keys Setup

### xAI Grok API
1. Go to https://console.x.ai/
2. Create account and get API key
3. Add to `.env` as `XAI_API_KEY`

### LiveKit Cloud
1. Go to https://cloud.livekit.io/
2. Create free account
3. Create project and get credentials
4. Add to `.env`:
   - `LIVEKIT_URL`: wss://project-name.livekit.cloud
   - `LIVEKIT_API_KEY`: Your API key
   - `LIVEKIT_API_SECRET`: Your API secret

## Usage

1. Click the microphone button to start talking
2. Speak clearly - Grok will process in real-time
3. See transcript of conversation
4. Click mic again to stop recording
5. Use "Clear Transcript" to clean chat history

## Special Features

- **Honk Trigger**: Say "honk my titty" and Grok responds with "boop" and a laugh
- **Volume Indicator**: Shows your voice input level
- **Connection Status**: Real-time connection monitoring
- **Auto-reconnect**: Automatically reconnects if connection drops

## Architecture

```
Browser (WebRTC) → LiveKit Room → Express Server → xAI Grok WebSocket → Audio Response
```

- **Frontend**: Single HTML file with vanilla JavaScript
- **Backend**: Express + WebSocket server
- **Audio Pipeline**: Browser mic → LiveKit → xAI Grok → LiveKit → Browser speakers

## Dependencies

- `express`: Web server
- `ws`: WebSocket support
- `dotenv`: Environment variables
- `livekit-server-sdk`: LiveKit integration
- `@livekit/agents`: LiveKit agents
- `uuid`: Unique IDs

## Troubleshooting

- **Mic not working**: Check browser permissions and HTTPS requirements
- **Connection failed**: Verify API keys in `.env`
- **Audio latency**: Check network connection and LiveKit region
- **Grok not responding**: Verify xAI API key and credits

## Development

Run in development mode:
```bash
npm run dev
```

Check server health:
```bash
curl http://localhost:3000/health
```

## License

MIT License - feel free to modify and deploy.
