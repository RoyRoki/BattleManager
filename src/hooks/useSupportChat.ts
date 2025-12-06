import { useState, useEffect } from 'react';
import { ref, push, onValue, off, serverTimestamp } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useSupportChat = () => {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      setIsLoading(false);
      return;
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    // For users: support_chats/{user_mobile}/messages
    // For admins: they can view any user's chat by user_mobile
    const chatPath = `support_chats/${user.mobile_no}/messages`;
    const messagesRef = ref(database, chatPath);

    const unsubscribe = onValue(
      messagesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const messageList: ChatMessage[] = Object.keys(data)
            .map((key) => ({
              id: key,
              ...data[key],
              timestamp: data[key].timestamp
                ? new Date(data[key].timestamp)
                : new Date(),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(messageList);
        } else {
          setMessages([]);
        }
        setIsLoading(false);
      },
      (error: any) => {
        console.error('Error listening to support chat:', error);
        if (error.code === 'PERMISSION_DENIED') {
          console.error(
            'Permission denied. Please ensure Firebase Realtime Database rules are deployed. Run: firebase deploy --only database'
          );
        }
        setIsLoading(false);
      }
    );

    return () => {
      off(messagesRef);
      unsubscribe();
    };
  }, [user]);

  const sendMessage = async (message: string, targetUserMobile?: string): Promise<boolean> => {
    if (!user || !message.trim() || !database) {
      if (!database) {
        console.error('Database not initialized');
      }
      return false;
    }

    try {
      // If admin is replying, use target user's mobile, otherwise use current user's mobile
      const chatPath = isAdmin && targetUserMobile
        ? `support_chats/${targetUserMobile}/messages`
        : `support_chats/${user.mobile_no}/messages`;
      
      const messagesRef = ref(database, chatPath);
      await push(messagesRef, {
        user_mobile: user.mobile_no,
        user_name: user.name || user.mobile_no,
        message: message.trim(),
        timestamp: serverTimestamp(),
        is_admin: isAdmin || false,
      });
      return true;
    } catch (error) {
      console.error('Error sending support message:', error);
      return false;
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};

