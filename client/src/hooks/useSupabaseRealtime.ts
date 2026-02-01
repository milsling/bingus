import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface UseSupabaseRealtimeOptions {
  userId?: string;
  selectedConversationId?: string;
}

export function useSupabaseRealtime({ userId, selectedConversationId }: UseSupabaseRealtimeOptions) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const userIdRef = useRef(userId);

  selectedConversationIdRef.current = selectedConversationId;
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    async function setupRealtime() {
      const supabase = await getSupabase();
      if (!supabase || !mounted) {
        setIsSupabaseReady(false);
        return;
      }
      
      setIsSupabaseReady(true);

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`dm-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `sender_id=eq.${userId}`,
          },
          (payload) => {
            const message = (payload as any).new as DirectMessage;
            const formattedMessage = {
              id: message.id,
              senderId: message.sender_id,
              receiverId: message.receiver_id,
              content: message.content,
              readAt: message.read_at,
              createdAt: message.created_at,
            };
            
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            
            const relevantUserId = formattedMessage.senderId === userIdRef.current 
              ? formattedMessage.receiverId 
              : formattedMessage.senderId;
              
            if (selectedConversationIdRef.current === relevantUserId) {
              queryClient.setQueryData(['messages', selectedConversationIdRef.current], (old: any[] = []) => {
                const exists = old.some(msg => msg.id === formattedMessage.id);
                if (exists) return old;
                return [formattedMessage, ...old];
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `receiver_id=eq.${userId}`,
          },
          (payload) => {
            const message = (payload as any).new as DirectMessage;
            const formattedMessage = {
              id: message.id,
              senderId: message.sender_id,
              receiverId: message.receiver_id,
              content: message.content,
              readAt: message.read_at,
              createdAt: message.created_at,
            };
            
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            
            const relevantUserId = formattedMessage.senderId === userIdRef.current 
              ? formattedMessage.receiverId 
              : formattedMessage.senderId;
              
            if (selectedConversationIdRef.current === relevantUserId) {
              queryClient.setQueryData(['messages', selectedConversationIdRef.current], (old: any[] = []) => {
                const exists = old.some(msg => msg.id === formattedMessage.id);
                if (exists) return old;
                return [formattedMessage, ...old];
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            console.log('Supabase Realtime connected for DMs');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            console.warn('Supabase Realtime error:', status);
          }
        });

      channelRef.current = channel;
    }

    setupRealtime();

    return () => {
      mounted = false;
      if (channelRef.current) {
        getSupabase().then(supabase => {
          if (supabase && channelRef.current) {
            supabase.removeChannel(channelRef.current);
          }
        });
      }
    };
  }, [userId, queryClient]);

  return {
    isConnected,
    isSupabaseReady,
  };
}
