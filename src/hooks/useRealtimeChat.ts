import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, off, serverTimestamp, remove, get } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesRef = ref(database, 'global_chat');
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Cleanup function to delete messages older than 2 days
   * Runs client-side to keep the chat database clean
   */
  const cleanupOldMessages = async (): Promise<void> => {
    if (!database) {
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
      if (messagesToDelete.length > 0) {
        const deletePromises = messagesToDelete.map((messageId) => {
          const messageRef = ref(database, `global_chat/${messageId}`);
          return remove(messageRef);
        });

        await Promise.all(deletePromises);
        console.log(`✅ Cleaned up ${messagesToDelete.length} old message(s) from chat`);
      }
    } catch (error) {
      console.error('Error cleaning up old messages:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onValue(
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
      off(messagesRef);
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !message.trim()) {
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
    sendMessage,
  };
};


