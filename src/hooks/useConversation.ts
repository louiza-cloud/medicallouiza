import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'messaging_conversation_id';

export interface UseConversationReturn {
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
  userName: string;
  userEmail: string;
  setUserName: (name: string) => void;
  setUserEmail: (email: string) => void;
  createConversation: (name: string, email: string, initialMessage: string) => Promise<string | null>;
  restoreConversation: () => Promise<boolean>;
  clearConversation: () => void;
}

export function useConversation(): UseConversationReturn {
  const [conversationId, setConversationId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('[useConversation] Initial conversationId from localStorage:', stored);
    return stored || null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Persist conversationId to localStorage
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem(STORAGE_KEY, conversationId);
      console.log('[useConversation] Saved conversationId to localStorage:', conversationId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[useConversation] Removed conversationId from localStorage');
    }
  }, [conversationId]);

  // Generate a unique conversation ID
  const generateConversationId = useCallback((): string => {
    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log('[useConversation] Generated conversationId:', id);
    return id;
  }, []);

  // Create a new conversation with initial message
  const createConversation = useCallback(async (
    name: string,
    email: string,
    initialMessage: string
  ): Promise<string | null> => {
    if (!name || !email || !initialMessage.trim()) {
      setError('Nom, email et message sont requis');
      return null;
    }

    setIsLoading(true);
    setError(null);

    const newConvId = generateConversationId();
    console.log('[useConversation] Creating new conversation:', newConvId);

    try {
      // Insert the first message which creates the conversation
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: newConvId,
        sender_type: 'patient',
        sender_name: name,
        sender_email: email,
        content: initialMessage.trim(),
        status: 'sent',
      });

      if (insertError) {
        console.error('[useConversation] Insert error:', insertError);
        throw insertError;
      }

      // Store the conversation data
      setConversationId(newConvId);
      setUserName(name);
      setUserEmail(email);

      console.log('[useConversation] Conversation created successfully:', newConvId);
      setIsLoading(false);
      return newConvId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la conversation';
      console.error('[useConversation] Error creating conversation:', err);
      setError(message);
      setIsLoading(false);
      return null;
    }
  }, [generateConversationId]);

  // Restore an existing conversation
  const restoreConversation = useCallback(async (): Promise<boolean> => {
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (!storedId) {
      console.log('[useConversation] No stored conversationId to restore');
      return false;
    }

    console.log('[useConversation] Restoring conversation:', storedId);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', storedId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (fetchError) {
        console.error('[useConversation] Fetch error:', fetchError);
        throw fetchError;
      }

      if (!data || data.length === 0) {
        console.log('[useConversation] No messages found for conversationId:', storedId);
        // Conversation ID exists but no messages - clear it
        localStorage.removeItem(STORAGE_KEY);
        setConversationId(null);
        setIsLoading(false);
        return false;
      }

      const firstMessage = data[0];
      setConversationId(storedId);
      setUserName(firstMessage.sender_name || '');
      setUserEmail(firstMessage.sender_email || '');

      console.log('[useConversation] Conversation restored successfully:', storedId);
      setIsLoading(false);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la restauration de la conversation';
      console.error('[useConversation] Error restoring conversation:', err);
      setError(message);
      localStorage.removeItem(STORAGE_KEY);
      setConversationId(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  // Clear the current conversation
  const clearConversation = useCallback(() => {
    console.log('[useConversation] Clearing conversation');
    localStorage.removeItem(STORAGE_KEY);
    setConversationId(null);
    setUserName('');
    setUserEmail('');
    setError(null);
  }, []);

  // Auto-restore on mount if conversationId exists
  useEffect(() => {
    if (!conversationId) {
      console.log('[useConversation] No conversationId, skipping auto-restore');
      return;
    }

    // Check if we already have user data
    if (userName && userEmail) {
      console.log('[useConversation] Already have user data, skipping restore');
      return;
    }

    console.log('[useConversation] Auto-restoring conversation on mount');
    restoreConversation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    conversationId,
    isLoading,
    error,
    userName,
    userEmail,
    setUserName,
    setUserEmail,
    createConversation,
    restoreConversation,
    clearConversation,
  };
}
