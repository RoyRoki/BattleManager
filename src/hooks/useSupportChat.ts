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

  // Determine which user's chat to view
  const targetEmail = options?.targetUserEmail || user?.email;

  // Mark messages as read when admin views a chat
  const markMessagesAsRead = useCallback(async (userEmail: string) => {
    if (!database || !isAdmin || !userEmail) return;

    try {
      const sanitizedEmail = sanitizeEmailForPath(userEmail);
      const metaRef = ref(database, `support_chats/${sanitizedEmail}/meta`);
      await update(metaRef, {
        last_read_by_admin: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [isAdmin]);

  // Listen to messages for a specific user's support chat
  useEffect(() => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      setIsLoading(false);
      return;
    }

    if (!targetEmail) {
      setIsLoading(false);
      return;
    }

    const sanitizedEmail = sanitizeEmailForPath(targetEmail);
    const chatPath = `support_chats/${sanitizedEmail}/messages`;
    const messagesRef = ref(database, chatPath);
    const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(MESSAGES_PER_PAGE));

    const unsubscribe = onValue(
      messagesQuery,
      (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const messageList: ChatMessage[] = Object.keys(data)
          .map((key) => {
            const msg = data[key];
            // Convert timestamp to Date
            let timestamp: Date;
            if (msg.timestamp) {
              if (typeof msg.timestamp === 'number') {
                timestamp = new Date(msg.timestamp > 1e12 ? msg.timestamp : msg.timestamp * 1000);
              } else if (typeof msg.timestamp === 'string') {
                timestamp = new Date(Number(msg.timestamp) || Date.now());
              } else {
                timestamp = new Date();
              }
            } else {
              timestamp = new Date();
            }
            
            return {
              id: key,
              ...msg,
              timestamp,
              message_type: msg.message_type || 'text',
            };
          })
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Merge real messages with recent temp messages that haven't been replaced yet
        setMessages((prevMessages) => {
          const tempMessages = prevMessages.filter(msg => msg.id.startsWith('temp-'));
          if (tempMessages.length === 0) {
            return messageList;
          }
          
          // Keep temp messages that are very recent (within last 10 seconds) and don't match real messages
          const now = Date.now();
          const recentTempMessages = tempMessages.filter(tempMsg => {
            const isRecent = (now - tempMsg.timestamp.getTime()) < 10000; // Within 10 seconds
            if (!isRecent) return false;
            
            // Check if there's a matching real message (same content, same sender, within 5 seconds)
            const hasMatch = messageList.some(realMsg => {
              const timeDiff = Math.abs(realMsg.timestamp.getTime() - tempMsg.timestamp.getTime());
              const contentMatch = realMsg.message === tempMsg.message && 
                                  realMsg.image_url === tempMsg.image_url &&
                                  realMsg.is_admin === tempMsg.is_admin;
              return contentMatch && timeDiff < 5000;
            });
            
            return !hasMatch; // Keep if no match found
          });
          
          // Combine and sort
          const allMessages = [...messageList, ...recentTempMessages];
          return allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        });
      } else {
        // Clear messages except temp ones (in case message was just sent)
        setMessages((prevMessages) => prevMessages.filter(msg => msg.id.startsWith('temp-')));
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

    // Mark messages as read when admin views the chat
    if (isAdmin && targetEmail) {
      markMessagesAsRead(targetEmail);
    }

    return () => {
      off(messagesRef);
      unsubscribe();
    };
  }, [targetEmail, isAdmin, markMessagesAsRead]);

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

        for (const sanitizedEmail of Object.keys(data)) {
          const chatData = data[sanitizedEmail];
          // Desanitize the email to get the original email address
          const userEmail = desanitizeEmailFromPath(sanitizedEmail);
          const messages = chatData.messages || {};
          const messageKeys = Object.keys(messages);

          if (messageKeys.length > 0) {
            // Sort messages by timestamp
            const sortedMessages = messageKeys
              .map(key => ({ key, ...messages[key] }))
              .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

            // Get the last message for preview
            const lastMessage = sortedMessages[sortedMessages.length - 1];
            
            // Find the user's name from the first non-admin message
            const firstUserMessage = sortedMessages.find(msg => !msg.is_admin);
            const userName = firstUserMessage?.user_name || userEmail;
            
            // Count unread messages (messages from user after last admin read timestamp)
            let unreadCount = 0;
            let hasAdminReply = false;
            
            // Get last_read_by_admin timestamp from metadata
            const meta = chatData.meta || {};
            const lastReadByAdmin = meta.last_read_by_admin;
            // Convert timestamp to number (handle Firebase server timestamp objects)
            let lastReadTimestamp: number | null = null;
            if (lastReadByAdmin !== undefined && lastReadByAdmin !== null) {
              if (typeof lastReadByAdmin === 'number') {
                lastReadTimestamp = lastReadByAdmin;
              } else if (typeof lastReadByAdmin === 'string') {
                // Handle string timestamps
                lastReadTimestamp = Number(lastReadByAdmin) || null;
              } else if (lastReadByAdmin && typeof lastReadByAdmin === 'object') {
                // Firebase server timestamp placeholder - treat as unread until server resolves
                if ('.sv' in lastReadByAdmin) {
                  lastReadTimestamp = null;
                } else {
                  // Try to extract timestamp value from object
                  lastReadTimestamp = Number(lastReadByAdmin) || null;
                }
              }
            }

            // Count unread: messages from user that are after last_read_by_admin timestamp
            for (let i = sortedMessages.length - 1; i >= 0; i--) {
              const msg = sortedMessages[i];
              
              if (msg.is_admin) {
                hasAdminReply = true;
                // If admin has replied, don't count messages before the reply as unread
                // But continue to check older messages
                continue;
              } else {
                // Only count as unread if:
                // 1. It's a user message (not admin)
                // 2. Either no last_read_by_admin timestamp exists, or message is after it
                let msgTimestamp: number = 0;
                if (msg.timestamp) {
                  if (typeof msg.timestamp === 'number') {
                    msgTimestamp = msg.timestamp;
                  } else if (typeof msg.timestamp === 'string') {
                    msgTimestamp = Number(msg.timestamp) || 0;
                  } else {
                    msgTimestamp = 0;
                  }
                }
                
                if (lastReadTimestamp === null || msgTimestamp > lastReadTimestamp) {
                  unreadCount++;
                } else {
                  // Messages before last_read_by_admin are read, stop counting
                  break;
                }
              }
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

      const sanitizedEmail = sanitizeEmailForPath(chatEmail);
      const chatPath = `support_chats/${sanitizedEmail}/messages`;
      const messagesRef = ref(database, chatPath);
      
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_email: isAdmin ? 'admin' : (user?.email || ''),
        user_name: isAdmin ? 'Admin' : (user?.name || user?.email || 'User'),
        message: message.trim(),
        timestamp: new Date(),
        is_admin: isAdmin || false,
        message_type: 'text',
      };

      // Optimistically add message to local state
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, optimisticMessage];
        return newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      
      const pushResult = await push(messagesRef, {
        user_email: isAdmin ? 'admin' : (user?.email || ''),
        user_name: isAdmin ? 'Admin' : (user?.name || user?.email || 'User'),
        message: message.trim(),
        timestamp: serverTimestamp(),
        is_admin: isAdmin || false,
        message_type: 'text',
      });

      // Update chat metadata
      const metaRef = ref(database, `support_chats/${sanitizedEmail}/meta`);
      const metaUpdate: any = {
        last_message: message.trim().substring(0, 100),
        last_message_time: serverTimestamp(),
        has_admin_reply: isAdmin || false,
      };
      
      // If admin is replying, mark all messages as read
      if (isAdmin) {
        metaUpdate.last_read_by_admin = serverTimestamp();
      }
      
      await update(metaRef, metaUpdate);

      return true;
    } catch (error) {
      console.error('Error sending support message:', error);
      // Remove optimistic message on error
      setMessages((prevMessages) => prevMessages.filter(msg => !msg.id.startsWith('temp-')));
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

      const sanitizedEmail = sanitizeEmailForPath(chatEmail);
      const chatPath = `support_chats/${sanitizedEmail}/messages`;
      const messagesRef = ref(database, chatPath);
      
      // Create optimistic message for immediate UI update
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_email: isAdmin ? 'admin' : (user?.email || ''),
        user_name: isAdmin ? 'Admin' : (user?.name || user?.email || 'User'),
        message: '',
        image_url: imageUrl,
        timestamp: new Date(),
        is_admin: isAdmin || false,
        message_type: 'image',
      };

      // Optimistically add message to local state
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages, optimisticMessage];
        return newMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      
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
      const metaRef = ref(database, `support_chats/${sanitizedEmail}/meta`);
      const metaUpdate: any = {
        last_message: '📷 Image',
        last_message_time: serverTimestamp(),
        has_admin_reply: isAdmin || false,
      };
      
      // If admin is replying, mark all messages as read
      if (isAdmin) {
        metaUpdate.last_read_by_admin = serverTimestamp();
      }
      
      await update(metaRef, metaUpdate);

      setIsUploading(false);
      return true;
    } catch (error) {
      console.error('Error sending image message:', error);
      // Remove optimistic message on error
      setMessages((prevMessages) => prevMessages.filter(msg => !msg.id.startsWith('temp-')));
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
    markMessagesAsRead,
  };
};
