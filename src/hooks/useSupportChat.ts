import { useState, useEffect, useCallback } from 'react';
import { ref, push, onValue, off, serverTimestamp, get, query, orderByChild, limitToLast, update } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage, SupportChat } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { uploadImage } from '../services/cloudinaryService';
import { sanitizeEmailForPath, desanitizeEmailFromPath } from '../utils/firebasePathUtils';

const MESSAGES_PER_PAGE = 50;

interface UseSupportChatOptions {
  targetUserEmail?: string; // For admin: specify which user's chat to view
}

export const useSupportChat = (options?: UseSupportChatOptions) => {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

  // Determine which user's chat to view (use email, sanitized for Firebase path)
  const targetEmail = options?.targetUserEmail || user?.email;
  const targetEmailSanitized = targetEmail ? sanitizeEmailForPath(targetEmail) : null;

  // Listen to messages for a specific user's support chat
  useEffect(() => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      setIsLoading(false);
      return;
    }

    if (!targetEmailSanitized) {
      setIsLoading(false);
      return;
    }

    const chatPath = `support_chats/${targetEmailSanitized}/messages`;
    const messagesRef = ref(database, chatPath);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(MESSAGES_PER_PAGE));

    const unsubscribe = onValue(
      messagesQuery,
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
              message_type: data[key].message_type || 'text',
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
  }, [targetEmailSanitized]);

  // Admin: Load all support chats list
  const loadSupportChats = useCallback(async () => {
    if (!database || !isAdmin) return;

    setIsLoadingChats(true);
    try {
      const chatsRef = ref(database, 'support_chats');
      const snapshot = await get(chatsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const chatList: SupportChat[] = [];

        for (const userEmailSanitized of Object.keys(data)) {
          const chatData = data[userEmailSanitized];
          const messages = chatData.messages || {};
          const messageKeys = Object.keys(messages);

          if (messageKeys.length > 0) {
            // Sort messages by timestamp
            const sortedMessages = messageKeys
              .map(key => ({ key, ...messages[key] }))
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            // Get the last message for preview
            const lastMessage = sortedMessages[sortedMessages.length - 1];
            
            // Desanitize email for display
            const userEmail = desanitizeEmailFromPath(userEmailSanitized);
            
            // Find the user's name from the first non-admin message
            const firstUserMessage = sortedMessages.find(msg => !msg.is_admin);
            const userName = firstUserMessage?.user_name || userEmail;
            
            // Count unread messages (messages from user after last admin reply)
            let unreadCount = 0;
            let hasAdminReply = false;

            for (let i = sortedMessages.length - 1; i >= 0; i--) {
              if (sortedMessages[i].is_admin) {
                hasAdminReply = true;
                break;
              }
              unreadCount++;
            }

            chatList.push({
              user_email: userEmail,
              user_name: userName,
              last_message: lastMessage.message_type === 'image' ? '📷 Image' : lastMessage.message,
              last_message_time: lastMessage.timestamp ? new Date(lastMessage.timestamp) : undefined,
              unread_count: unreadCount,
              has_admin_reply: hasAdminReply,
            });
          }
        }

        // Sort by last message time (newest first)
        chatList.sort((a, b) => {
          const timeA = a.last_message_time?.getTime() || 0;
          const timeB = b.last_message_time?.getTime() || 0;
          return timeB - timeA;
        });

        setSupportChats(chatList);
      } else {
        setSupportChats([]);
      }
    } catch (error) {
      console.error('Error loading support chats:', error);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAdmin]);

  // Listen to support chats updates for admin
  useEffect(() => {
    if (!database || !isAdmin) return;

    loadSupportChats();

    // Listen for updates to refresh the chat list
    const chatsRef = ref(database, 'support_chats');
    onValue(chatsRef, () => {
      loadSupportChats();
    });

    return () => {
      off(chatsRef);
    };
  }, [isAdmin, loadSupportChats]);

  // Send text message
  const sendMessage = async (message: string, targetUserEmail?: string): Promise<boolean> => {
    // Allow admin to send even without user object
    if ((!user && !isAdmin) || !message.trim() || !database) {
      if (!database) {
        console.error('Database not initialized');
      }
      return false;
    }

    try {
      // If admin is replying, use target user's email, otherwise use current user's email
      const chatEmail = isAdmin && targetUserEmail
        ? targetUserEmail
        : targetEmail;
      
      if (!chatEmail) {
        console.error('No chat email specified');
        return false;
      }

      const chatEmailSanitized = sanitizeEmailForPath(chatEmail);
      const chatPath = `support_chats/${chatEmailSanitized}/messages`;
      const messagesRef = ref(database, chatPath);
      
      await push(messagesRef, {
        user_email: isAdmin ? 'admin' : (user?.email || ''),
        user_name: isAdmin ? 'Admin' : (user?.name || user?.email || 'User'),
        message: message.trim(),
        timestamp: serverTimestamp(),
        is_admin: isAdmin || false,
        message_type: 'text',
      });

      // Update chat metadata
      const metaRef = ref(database, `support_chats/${chatEmailSanitized}/meta`);
      await update(metaRef, {
        last_message: message.trim().substring(0, 100),
        last_message_time: serverTimestamp(),
        has_admin_reply: isAdmin || false,
      });

      return true;
    } catch (error) {
      console.error('Error sending support message:', error);
      return false;
    }
  };

  // Send image message
  const sendImageMessage = async (file: File, targetUserEmail?: string): Promise<boolean> => {
    // Allow admin to send even without user object
    if ((!user && !isAdmin) || !database) {
      if (!database) {
        console.error('Database not initialized');
      }
      return false;
    }

    setIsUploading(true);
    try {
      // Upload image to Cloudinary
      const imageUrl = await uploadImage(file, 'support_chat');

      // Determine target chat
      const chatEmail = isAdmin && targetUserEmail
        ? targetUserEmail
        : targetEmail;
      
      if (!chatEmail) {
        console.error('No chat email specified');
        setIsUploading(false);
        return false;
      }

      const chatEmailSanitized = sanitizeEmailForPath(chatEmail);
      const chatPath = `support_chats/${chatEmailSanitized}/messages`;
      const messagesRef = ref(database, chatPath);
      
      await push(messagesRef, {
        user_email: isAdmin ? 'admin' : (user?.email || ''),
        user_name: isAdmin ? 'Admin' : (user?.name || user?.email || 'User'),
        message: '',
        image_url: imageUrl,
        timestamp: serverTimestamp(),
        is_admin: isAdmin || false,
        message_type: 'image',
      });

      // Update chat metadata
      const metaRef = ref(database, `support_chats/${chatEmailSanitized}/meta`);
      await update(metaRef, {
        last_message: '📷 Image',
        last_message_time: serverTimestamp(),
        has_admin_reply: isAdmin || false,
      });

      setIsUploading(false);
      return true;
    } catch (error) {
      console.error('Error sending image message:', error);
      setIsUploading(false);
      return false;
    }
  };

  return {
    messages,
    isLoading,
    isUploading,
    sendMessage,
    sendImageMessage,
    // Admin features
    supportChats,
    isLoadingChats,
    loadSupportChats,
  };
};
