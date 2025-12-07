import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, off, serverTimestamp, remove, get, query, limitToLast, orderByKey, endBefore } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesRef = database ? ref(database, 'global_chat') : null;
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Cleanup function to delete messages older than 2 days
   * Runs client-side to keep the chat database clean
   */
  const cleanupOldMessages = async (): Promise<void> => {
    if (!database || !messagesRef) {
      console.warn('Database not initialized, skipping cleanup');
      return;
    }

    try {
      const snapshot = await get(messagesRef);

      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.val();
      const now = Date.now();
      const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      const messagesToDelete: string[] = [];

      // Find messages older than 2 days
      Object.keys(data).forEach((key) => {
        const message = data[key];
        const timestamp = message.timestamp;

        // Skip if timestamp is a serverTimestamp placeholder or invalid
        if (!timestamp || typeof timestamp !== 'number') {
          return;
        }

        // Convert Firebase timestamp to milliseconds if needed
        // Firebase timestamps can be in seconds (10 digits) or milliseconds (13 digits)
        const messageTime = timestamp > 1e12 ? timestamp : timestamp * 1000;

        if (messageTime < twoDaysAgo) {
          messagesToDelete.push(key);
        }
      });

      // Delete old messages
      if (messagesToDelete.length > 0 && database && messagesRef) {
        const db = database; // Type narrowing for TypeScript
        const deletePromises = messagesToDelete.map((messageId) => {
          const messageRef = ref(db, `global_chat/${messageId}`);
          return remove(messageRef);
        });

        await Promise.all(deletePromises);
        console.log(`✅ Cleaned up ${messagesToDelete.length} old message(s) from chat`);
      }
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  };

  const loadOlderMessages = async (): Promise<void> => {
    if (!database || !messagesRef || isLoadingMore || !hasMoreMessages || messages.length === 0) {
      return;
    }

    setIsLoadingMore(true);
    try {
      // Get the first message timestamp to load messages before it
      const firstMessageKey = messages[0].id;
      const olderMessagesQuery = query(
        messagesRef,
        orderByKey(),
        endBefore(firstMessageKey),
        limitToLast(50)
      );

      const snapshot = await get(olderMessagesQuery);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const olderMessages: ChatMessage[] = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key],
            timestamp: new Date(data[key].timestamp),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        if (olderMessages.length > 0) {
          setMessages((prev) => [...olderMessages, ...prev]);
        } else {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!database || !messagesRef) {
      setIsLoading(false);
      return;
    }

    onValue(
      messagesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const messageList: ChatMessage[] = Object.keys(data)
            .map((key) => ({
              id: key,
              ...data[key],
              timestamp: new Date(data[key].timestamp),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(messageList);
        } else {
          setMessages([]);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to chat:', error);
        setIsLoading(false);
      }
    );

    // Run cleanup on mount
    cleanupOldMessages();

    // Run cleanup every hour (3600000 ms)
    cleanupIntervalRef.current = setInterval(() => {
      cleanupOldMessages();
    }, 3600000);

    return () => {
      if (messagesRef) {
        off(messagesRef);
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [database, messagesRef]);

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !message.trim() || !database || !messagesRef) {
      return false;
    }

    try {
      await push(messagesRef, {
        user_mobile: user.mobile_no,
        user_name: user.name || user.mobile_no,
        message: message.trim(),
        timestamp: serverTimestamp(),
        is_admin: false,
      });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreMessages,
    loadOlderMessages,
    sendMessage,
  };
};


