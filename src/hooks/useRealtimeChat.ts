import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, push, query, orderByChild, limitToLast, endAt, onValue, off, serverTimestamp, get } from 'firebase/database';
import { database } from '../services/firebaseService';
import { ChatMessage } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MESSAGES_PER_PAGE = 50;

export const useRealtimeChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const oldestTimestampRef = useRef<number | null>(null);
  const loadedMessageIdsRef = useRef<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Convert Firebase timestamp to Date
  const parseTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date(timestamp);
  };

  // Convert messages from Firebase snapshot
  const convertMessages = (data: any): ChatMessage[] => {
    if (!data) return [];
    return Object.keys(data)
      .map((key) => {
        const msg = data[key];
        const timestamp = parseTimestamp(msg.timestamp);
        return {
          id: key,
          user_mobile: msg.user_mobile || '',
          user_name: msg.user_name,
          message: msg.message || '',
          timestamp,
          is_admin: msg.is_admin || false,
        };
      })
      .filter((msg) => msg.user_mobile && msg.message);
  };

  // Load initial messages
  useEffect(() => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      setIsLoading(false);
      return;
    }

    const messagesRef = ref(database, 'global_chat');
    const initialQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(MESSAGES_PER_PAGE));

    const unsubscribe = onValue(
      initialQuery,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const messageList = convertMessages(data);
          const sortedMessages = messageList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          
          setMessages(sortedMessages);
          loadedMessageIdsRef.current = new Set(sortedMessages.map((m) => m.id));
          
          // Track oldest timestamp
          if (sortedMessages.length > 0) {
            const oldestTimestamp = sortedMessages[0].timestamp.getTime();
            oldestTimestampRef.current = oldestTimestamp;
            // Check if there might be more messages
            setHasMoreMessages(sortedMessages.length === MESSAGES_PER_PAGE);
          } else {
            oldestTimestampRef.current = null;
            setHasMoreMessages(false);
          }
        } else {
          setMessages([]);
          oldestTimestampRef.current = null;
          setHasMoreMessages(false);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error listening to chat:', error);
        setIsLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Also listen for new messages in real-time
    const newMessagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(1));
    const newMessagesUnsubscribe = onValue(
      newMessagesQuery,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const newMessages = convertMessages(data);
          
          setMessages((prevMessages) => {
            const existingIds = new Set(prevMessages.map((m) => m.id));
            const trulyNew = newMessages.filter((msg) => !existingIds.has(msg.id));
            
            if (trulyNew.length > 0) {
              const combined = [...prevMessages, ...trulyNew];
              return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            }
            return prevMessages;
          });
        }
      },
      (error) => {
        console.error('Error listening to new messages:', error);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      off(newMessagesQuery);
      newMessagesUnsubscribe();
    };
  }, []);

  // Load older messages
  const loadOlderMessages = useCallback(async (): Promise<boolean> => {
    if (!database || isLoadingMore || !hasMoreMessages || !oldestTimestampRef.current) {
      return false;
    }

    setIsLoadingMore(true);

    try {
      const messagesRef = ref(database, 'global_chat');
      // Load messages older than the oldest we have
      const olderQuery = query(
        messagesRef,
        orderByChild('timestamp'),
        endAt(oldestTimestampRef.current - 1),
        limitToLast(MESSAGES_PER_PAGE)
      );

      const snapshot = await get(olderQuery);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const olderMessages = convertMessages(data);
        const sortedOlder = olderMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Filter out duplicates
        const newMessages = sortedOlder.filter((msg) => !loadedMessageIdsRef.current.has(msg.id));
        
        if (newMessages.length > 0) {
          setMessages((prevMessages) => {
            const combined = [...newMessages, ...prevMessages];
            const sorted = combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            return sorted;
          });

          // Update loaded IDs
          newMessages.forEach((msg) => loadedMessageIdsRef.current.add(msg.id));

          // Update oldest timestamp
          const oldestMsg = newMessages[0];
          if (oldestMsg) {
            oldestTimestampRef.current = oldestMsg.timestamp.getTime();
          }

          // Check if there are more messages
          setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE);
        } else {
          setHasMoreMessages(false);
        }
      } else {
        setHasMoreMessages(false);
      }

      setIsLoadingMore(false);
      return true;
    } catch (error) {
      console.error('Error loading older messages:', error);
      setIsLoadingMore(false);
      return false;
    }
  }, [isLoadingMore, hasMoreMessages]);

  const sendMessage = async (message: string): Promise<boolean> => {
    if (!user || !message.trim() || !database) {
      if (!database) {
        console.error('Database not initialized');
      }
      return false;
    }

    try {
      const messagesRef = ref(database, 'global_chat');
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


