import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, off, serverTimestamp } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesRef = ref(database, 'global_chat');

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

    return () => {
      off(messagesRef);
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


