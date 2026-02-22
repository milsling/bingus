import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { log } from './index';
import { storage } from './storage';

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
    log('Voice WebSocket connection received', 'voice');

    // Get user from session — passport middleware doesn't run on WS upgrades,
    // so we read the user ID from the raw session data (session.passport.user)
    const session = (req as any).session;
    const passportUserId = session?.passport?.user;
    if (!passportUserId) {
      log('Voice WebSocket: No authenticated user in session', 'voice');
      clientWs.close(4001, 'Unauthorized');
      return;
    }

    // Look up the full user object (same as passport.deserializeUser)
    const dbUser = await storage.getUser(passportUserId);
    if (!dbUser) {
      log(`Voice WebSocket: User ${passportUserId} not found in database`, 'voice');
      clientWs.close(4001, 'Unauthorized');
      return;
    }

    const user = { id: dbUser.id, username: dbUser.username };
    const sessionId = `${user.id}-${Date.now()}`;
    log(`Starting voice session for user: ${user.username} (${sessionId})`, 'voice');

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
      log('Connecting to xAI...', 'voice');
      
      const xaiWs = new WebSocket(xaiWsUrl, {
        headers: {
          'Authorization': `Bearer ${xaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      session.xaiWs = xaiWs;

      xaiWs.on('open', () => {
        log('Connected to xAI', 'voice');

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
            instructions: `You are Orphie, the AI assistant for orphanbars.space. You're helpful, friendly, and conversational. Keep responses concise and natural.`,
          },
        }));
        
        // Send initial greeting to trigger first response
        setTimeout(() => {
          if (session.isActive && xaiWs.readyState === WebSocket.OPEN) {
            xaiWs.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
              }
            }));
          }
        }, 500);
      });

      xaiWs.on('message', (data: Buffer | string) => {
        if (!session.isActive) return;

        try {
          const message = JSON.parse(data.toString());
          
          // Log all message types for debugging
          log(`xAI message: ${message.type} ${message.event_id ? `(${message.event_id})` : ''}`, 'voice');
          
          // Handle different message types (OpenAI Realtime API compatible)
          // Audio response events
          if (message.type === 'response.audio.delta' || message.type === 'response.audio_transcript.delta') {
            if (message.delta && typeof message.delta === 'string') {
              try {
                log(`Received audio delta, base64 length: ${message.delta.length}`, 'voice');
                const audioData = Buffer.from(message.delta, 'base64');
                log(`Decoded audio buffer size: ${audioData.length} bytes`, 'voice');
                
                if (audioData.length > 0 && clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(audioData);
                  log('Sent audio to client', 'voice');
                }
              } catch (decodeError) {
                log(`Failed to decode audio: ${decodeError}`, 'voice');
              }
            }
          } 
          // Response completed events
          else if (message.type === 'response.audio.done' || message.type === 'response.done') {
            log('AI response completed', 'voice');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'ai_done' }));
            }
          }
          // Transcript events
          else if (message.type === 'response.text.delta' || message.type === 'response.output_item.added') {
            if (message.delta || message.item?.content) {
              const text = message.delta || message.item?.content?.[0]?.text || '';
              if (text && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({
                  type: 'transcript',
                  role: 'assistant',
                  text: text,
                }));
              }
            }
          }
          else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            log(`User transcript: ${message.transcript}`, 'voice');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'transcript',
                role: 'user',
                text: message.transcript || '',
              }));
            }
          }
          // Speech detection events
          else if (message.type === 'input_audio_buffer.speech_started') {
            log('Speech detected', 'voice');
          }
          else if (message.type === 'input_audio_buffer.speech_stopped') {
            log('Speech ended, triggering response...', 'voice');
            // Commit the audio buffer and request response
            if (xaiWs.readyState === WebSocket.OPEN) {
              xaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.commit'
              }));
              xaiWs.send(JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                }
              }));
            }
          }
          // Session events
          else if (message.type === 'session.created' || message.type === 'session.updated') {
            log(`Session configured: ${message.type}`, 'voice');
          }
          // Error handling
          else if (message.type === 'error') {
            log(`xAI error: ${JSON.stringify(message.error)}`, 'voice');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: message.error?.message || 'Voice API error',
              }));
            }
          }
          // Log unknown event types
          else {
            log(`Unhandled event type: ${message.type}`, 'voice');
          }
        } catch (err) {
          log(`Error processing xAI message: ${err}`, 'voice');
        }
      });

      xaiWs.on('error', (error) => {
        log(`xAI WebSocket error: ${error}`, 'voice');
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Voice service error',
          }));
        }
      });

      xaiWs.on('close', () => {
        log('xAI WebSocket closed', 'voice');
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
          log(`Error forwarding audio to xAI: ${err}`, 'voice');
        }
      });

      clientWs.on('close', () => {
        log('Client disconnected', 'voice');
        session.isActive = false;
        if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.close();
        }
        activeSessions.delete(sessionId);
      });

      clientWs.on('error', (error) => {
        log(`Client WebSocket error: ${error}`, 'voice');
        session.isActive = false;
        if (xaiWs && xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.close();
        }
      });

    } catch (error: any) {
      log(`Voice session setup error: ${error}`, 'voice');
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

  log('Voice WebSocket server initialized', 'voice');
}
