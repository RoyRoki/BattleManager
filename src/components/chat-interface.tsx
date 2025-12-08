import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { useAuth } from '../contexts/AuthContext';
import { chatMessageSchema } from '../utils/validations';
import { playMessageSent, playMessageReceived } from '../services/chatSoundService';
import { groupMessagesByDate, formatMessageTime, formatFullTimestamp } from '../utils/dateUtils';
import { ChatMessage } from '../types';
import toast from 'react-hot-toast';
import { HiPaperAirplane } from 'react-icons/hi';
import { getUserFriendlyError } from '../shared/utils/errorHandler';

interface MessageGroup {
  date: Date;
  dateLabel: string;
  messages: ChatMessage[];
}

export const ChatInterface: React.FC = () => {
  const { messages, isLoading, isLoadingMore, hasMoreMessages, loadOlderMessages, sendMessage } = useRealtimeChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const previousMessagesLengthRef = useRef<number>(0);
  const shouldScrollToBottomRef = useRef<boolean>(true);
  const isUserScrollingUpRef = useRef<boolean>(false);

  // Group messages by date
  const messageGroups: MessageGroup[] = groupMessagesByDate(messages);

  // Scroll to bottom function
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Handle scroll events for infinite scroll
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Check if user is scrolling up (within 200px of top)
    const isNearTop = scrollTop < 200;
    isUserScrollingUpRef.current = isNearTop;

    // Check if we're near the bottom (within 100px)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollToBottomRef.current = isNearBottom;
  }, []);

  // Infinite scroll: Load older messages when scrolling to top
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMore) {
          const previousScrollHeight = messagesContainerRef.current?.scrollHeight || 0;
          loadOlderMessages().then(() => {
            // Maintain scroll position after loading older messages
            if (messagesContainerRef.current) {
              const newScrollHeight = messagesContainerRef.current.scrollHeight;
              const scrollDiff = newScrollHeight - previousScrollHeight;
              messagesContainerRef.current.scrollTop += scrollDiff;
            }
          });
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current);
    }

    return () => {
      if (loadMoreTriggerRef.current) {
        observer.unobserve(loadMoreTriggerRef.current);
      }
    };
  }, [hasMoreMessages, isLoadingMore, loadOlderMessages]);

  // Auto-scroll to bottom on new messages (only if user is at bottom)
  useEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLengthRef.current;

    // Only auto-scroll if:
    // 1. New messages were added (length increased)
    // 2. User is at the bottom (should scroll to bottom)
    // 3. Not loading older messages
    if (currentLength > previousLength && shouldScrollToBottomRef.current && !isLoadingMore) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }

    previousMessagesLengthRef.current = currentLength;
  }, [messages.length, isLoadingMore, scrollToBottom]);

  // Play sound on new messages
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      const newMessages = messages.slice(previousMessagesLengthRef.current);
      const userEmail = user?.email?.toLowerCase().trim() || '';
      const hasReceivedMessage = newMessages.some((msg) => {
        const msgEmail = msg.user_email?.toLowerCase().trim() || '';
        return msgEmail !== userEmail;
      });
      if (hasReceivedMessage) {
        playMessageReceived();
      }
    }
  }, [messages.length, user?.email]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isLoading, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to send messages');
      return;
    }

    try {
      chatMessageSchema.parse(message);
      const success = await sendMessage(message);
      if (success) {
        setMessage('');
        playMessageSent();
        // Scroll to bottom after sending
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (error: any) {
      const friendlyError = getUserFriendlyError(error, undefined, 'Failed to send message. Please try again.');
      toast.error(friendlyError);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <div className="text-gray-400 font-body">Loading messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {/* Load More Trigger (invisible element at top) */}
        {hasMoreMessages && (
          <div ref={loadMoreTriggerRef} className="h-1" />
        )}

        {/* Loading Indicator for Older Messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Loading older messages...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-heading text-gray-300 mb-2">No messages yet</h3>
            <p className="text-gray-500 font-body">Be the first to start the conversation!</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messageGroups.map((group) => (
            <React.Fragment key={`group-${group.date.getTime()}`}>
              {/* Date Separator */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center my-4"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                  <span className="text-xs text-gray-500 font-heading px-3 py-1 bg-bg-secondary rounded-full border border-gray-800">
                    {group.dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                </div>
              </motion.div>

              {/* Messages in Group */}
              {group.messages.map((msg) => {
                // Normalize emails for comparison (case-insensitive)
                const msgEmail = msg.user_email?.toLowerCase().trim() || '';
                const userEmail = user?.email?.toLowerCase().trim() || '';
                const isOwnMessage = msgEmail === userEmail;
                const isAdmin = msg.is_admin;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-end gap-2 w-full ${
                      isOwnMessage ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Avatar (only for other users, on the left) */}
                    {!isOwnMessage && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-bg font-heading text-xs font-bold border-2 border-gray-800">
                        {msg.user_name?.[0]?.toUpperCase() || msg.user_email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      {/* Username (only for other users) */}
                      {!isOwnMessage && (
                        <div className="text-xs text-gray-400 mb-1 px-2 flex items-center gap-1">
                          <span className="font-body">
                            {msg.user_name || msg.user_email}
                          </span>
                          {isAdmin && (
                            <span className="text-accent text-[10px] font-heading bg-accent/20 px-1.5 py-0.5 rounded">
                              ADMIN
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`relative px-4 py-2.5 rounded-2xl ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-primary to-accent text-bg rounded-br-md shadow-lg shadow-primary/20'
                            : isAdmin
                            ? 'bg-gradient-to-br from-accent/90 to-accent text-white rounded-bl-md shadow-lg shadow-accent/20'
                            : 'bg-bg-secondary text-white border border-gray-700 rounded-bl-md'
                        }`}
                        title={formatFullTimestamp(msg.timestamp)}
                      >
                        {/* Text Glow Effect for Own Messages */}
                        {isOwnMessage && (
                          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-sm -z-10"></div>
                        )}

                        <p className="text-sm font-body break-words leading-relaxed">{msg.message}</p>

                        {/* Timestamp */}
                        <div
                          className={`text-[10px] mt-1.5 ${
                            isOwnMessage ? 'text-bg/70' : 'text-gray-400'
                          }`}
                        >
                          {formatMessageTime(msg.timestamp)}
                        </div>
                      </motion.div>
                    </div>

                    {/* Spacer for alignment - avatar space for own messages on the right */}
                    {isOwnMessage && <div className="flex-shrink-0 w-8"></div>}
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </AnimatePresence>

        {/* Scroll Anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t border-gray-800 bg-bg-secondary/50 backdrop-blur-sm p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-bg-secondary border border-gray-700 rounded-full px-4 py-3 pr-20 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body text-white placeholder-gray-500"
              maxLength={500}
              autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {message.length}/500
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={!message.trim() || !user}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-br from-primary to-accent w-12 h-12 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-600 [&>svg]:!fill-black [&>svg]:!text-black [&>svg]:!stroke-none"
            aria-label="Send message"
            style={{ color: 'transparent' }}
          >
            <HiPaperAirplane 
              className="text-2xl rotate-[90deg] !fill-black !text-black" 
              style={{ 
                fill: '#000000', 
                color: '#000000',
                stroke: 'none'
              }} 
            />
          </motion.button>
        </div>
      </form>
    </div>
  );
};


