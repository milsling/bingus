import WebSocket from 'ws';
import { IncomingMessage } from 'http';

interface VoiceSession {
  clientWs: WebSocket;
  xaiWs: WebSocket | null;
  userId: string;
  username: string;
  isActive: boolean;
}

const activeSessions = new Map<string, VoiceSession>();

export function setupVoiceWebSocket(wss: WebSocket.Server) {
  wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
    console.log('Voice WebSocket connection received');

    // Get user from session
    const user = (req as any).user;
    if (!user || !user.id) {
      console.error('Voice WebSocket: No authenticated user');
      clientWs.close(4001, 'Unauthorized');
      return;
    }

    const sessionId = `${user.id}-${Date.now()}`;
    console.log(`Starting voice session for user: ${user.username} (${sessionId})`);

    const session: VoiceSession = {
      clientWs,
      xaiWs: null,
      userId: user.id,
      username: user.username || `user-${user.id}`,
      isActive: true,
    };

    activeSessions.set(sessionId, session);

    try {
      // Connect to xAI Realtime API
      const xaiApiKey = process.env.XAI_API_KEY;
      if (!xaiApiKey) {
        throw new Error('XAI_API_KEY not configured');
      }

      const xaiWsUrl = `wss://api.x.ai/v1/realtime?model=grok-2-vision-1212`;
      console.log('Connecting to xAI...');
      
      const xaiWs = new WebSocket(xaiWsUrl, {
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      session.xaiWs = xaiWs;

      xaiWs.on('open', () => {
        console.log('✓ Connected to xAI');

        // Send session configuration
        xaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'ara',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            instructions: `You are Ara, the AI assistant for orphanbars.space. You're helpful, friendly, and conversational. Keep responses concise and natural.`,
          },
        }));
      });

      xaiWs.on('message', (data: Buffer | string) => {
        if (!session.isActive) return;

        try {
          const message = JSON.parse(data.toString());
          
          // Handle different message types
          if (message.type === 'response.audio.delta') {
            // Forward audio data to client
            const audioData = Buffer.from(message.delta, 'base64');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(audioData);
            }
          } else if (message.type === 'response.audio.done') {
            // Notify client that AI is done speaking
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ai_done' }));
            }
          } else if (message.type === 'response.audio_transcript.delta') {
            // Forward AI transcript
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'transcript',
                role: 'assistant',
                text: message.delta || '',
              }));
            }
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            // Forward user transcript
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'transcript',
                role: 'user',
                text: message.transcript || '',
              }));
            }
          } else if (message.type === 'input_audio_buffer.speech_started') {
            console.log('Speech detected');
          } else if (message.type === 'input_audio_buffer.speech_stopped') {
            console.log('Speech ended');
          } else if (message.type === 'error') {
            console.error('xAI error:', message.error);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: message.error?.message || 'Voice API error',
              }));
            }
          }
        } catch (err) {
          console.error('Error processing xAI message:', err);
        }
      });

      xaiWs.on('error', (error) => {
        console.error('xAI WebSocket error:', error);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Voice service error',
          }));
        }
      });

      xaiWs.on('close', () => {
        console.log('xAI WebSocket closed');
        session.isActive = false;
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
      });

      // Handle client messages (audio from browser)
      clientWs.on('message', (data: Buffer) => {
        if (!session.isActive || !xaiWs || xaiWs.readyState !== WebSocket.OPEN) {
          return;
        }

        try {
          // Client sends raw PCM16 audio data
          // Convert to base64 and forward to xAI
          const base64Audio = data.toString('base64');
          xaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio,
          }));
        } catch (err) {
          console.error('Error forwarding audio to xAI:', err);
        }
      });

      clientWs.on('close', () => {
        console.log('Client disconnected');
        session.isActive = false;
        if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.close();
        }
        activeSessions.delete(sessionId);
      });

      clientWs.on('error', (error) => {
        console.error('Client WebSocket error:', error);
        session.isActive = false;
        if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.close();
        }
      });

    } catch (error: any) {
      console.error('Voice session setup error:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: error.message || 'Failed to initialize voice chat',
        }));
        clientWs.close();
      }
      activeSessions.delete(sessionId);
    }
  });

  console.log('Voice WebSocket server initialized');
}
