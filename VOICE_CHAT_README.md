# xAI Grok Voice Chat Integration

This document explains the new real-time speech-to-speech voice chat feature powered by xAI's Grok Voice Agent API.

## What's New

Your orphanbars.space website now has **true speech-to-speech voice chat** using xAI's Grok Voice Agent API with LiveKit for audio streaming.

### Features

- 🎙️ **Real-time voice conversations** - Speak naturally and Ara responds with voice instantly
- 🚀 **Low latency** - Average response time under 1 second
- 🌍 **100+ languages** - Automatic language detection and native-quality accents
- 💬 **Transcription** - See what you and Ara are saying in real-time
- 🎨 **Modern UI** - Seamless integration with your existing Ara assistant

## Architecture

```
User's Browser (React)
    ↓
VoiceChat Component (LiveKit Client)
    ↓
Your Server (/api/ai/voice/token)
    ↓
LiveKit Cloud (Audio Streaming)
    ↓
xAI Grok Voice Agent API
```

## Files Added/Modified

### New Files
- `client/src/components/VoiceChat.tsx` - React component for voice chat UI
- `VOICE_CHAT_README.md` - This documentation

### Modified Files
- `server/replit_integrations/ai/routes.ts` - Added `/api/ai/voice/token` endpoint
- `client/src/components/AIAssistant.tsx` - Added real voice mode toggle and integration
- `.env` - Added xAI and LiveKit credentials
- `package.json` - Added LiveKit dependencies

## How to Use

### For Users on Your Website

1. Open the Ara assistant (click the floating Ara button)
2. Look for the **Radio icon** button in the header (green when active)
3. Click it to enable "Real Voice Mode"
4. Click the **green phone button** to start the voice call
5. Speak naturally - Ara will respond with voice automatically
6. Click the **red phone button** to end the call

### Technical Details

**Environment Variables (already configured in `.env`):**
```bash
XAI_API_KEY=xai-STbtA7Tl...
LIVEKIT_URL=wss://orphan-bars-kqcmttmh.livekit.cloud
LIVEKIT_API_KEY=APImRjYk...
LIVEKIT_API_SECRET=Pgpc...
```

**API Endpoints:**
- `POST /api/ai/voice/token` - Generates LiveKit tokens for authenticated users

**Voice Configuration:**
- Voice: "Ara" (can be changed to Rex, Sal, Eve, or Leo)
- Audio format: PCM16
- Turn detection: Server-side VAD (Voice Activity Detection)
- Auto-transcription: Enabled

## Testing

### Start the Development Server

```bash
cd bingus
npm run dev
```

### Test Voice Chat

1. Navigate to your local dev server (usually http://localhost:5000)
2. Log in with your account
3. Open Ara assistant
4. Enable Real Voice Mode (Radio button)
5. Click the phone button to connect
6. Say "Hello Ara, can you help me with some rap bars?"
7. Ara should respond with voice!

## Cost

xAI Grok Voice Agent API pricing:
- **$0.05 per minute** of connection time
- No per-token charges for voice
- Includes all audio processing, transcription, and tool use

## Comparison: Old Voice Mode vs Real Voice Mode

| Feature | Old Voice Mode | Real Voice Mode |
|---------|---------------|-----------------|
| **Technology** | Browser STT + Text + Browser TTS | xAI Voice Agent (native S2S) |
| **Latency** | 2-4 seconds | <1 second |
| **Voice Quality** | Robotic (browser TTS) | Natural, expressive |
| **Audio Encoding** | Browser-dependent | PCM16 (studio quality) |
| **Interruption** | Not supported | Supported |
| **Multilingual** | Limited | 100+ languages |
| **Cost** | Free (browser APIs) | $0.05/minute |

## Troubleshooting

### Voice chat not connecting?

1. Check browser console for errors
2. Verify `.env` has all credentials
3. Make sure server is running
4. Check microphone permissions

### Audio quality issues?

- Ensure good internet connection
- Check microphone quality
- Try a different browser (Chrome recommended)

### Server errors?

```bash
# Restart the server
npm run dev
```

Check logs for:
- Missing environment variables
- xAI API key issues
- LiveKit connection problems

## Future Enhancements

Potential improvements:
- [ ] Premium-only voice chat access
- [ ] Voice chat history/recordings
- [ ] Custom voice selection UI
- [ ] Group voice chat rooms
- [ ] Voice-to-text export

## Support

For issues or questions:
1. Check the browser console for errors
2. Check server logs
3. Verify environment variables are set correctly

---

**Powered by:**
- [xAI Grok Voice Agent API](https://docs.x.ai/docs/guides/voice)
- [LiveKit](https://livekit.io/)
- React + TypeScript
