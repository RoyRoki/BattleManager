import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupportChat } from '../hooks/useSupportChat';
import { useAuth } from '../contexts/AuthContext';
import { chatMessageSchema } from '../utils/validations';
import { formatMessageTime, formatFullTimestamp, groupMessagesByDate } from '../utils/dateUtils';
import { ChatMessage } from '../types';
import toast from 'react-hot-toast';
import { HiPaperAirplane, HiPhotograph, HiX } from 'react-icons/hi';

interface MessageGroup {
  date: Date;
  dateLabel: string;
  messages: ChatMessage[];
}

interface SupportChatInterfaceProps {
  targetUserEmail?: string; // For admin: specify which user's chat to view
  onBack?: () => void; // For admin: callback to go back to chat list
  showHeader?: boolean;
}

export const SupportChatInterface: React.FC<SupportChatInterfaceProps> = ({
  targetUserEmail,
  onBack,
  showHeader = true,
}) => {
  const { messages, isLoading, isUploading, sendMessage, sendImageMessage } = useSupportChat({
    targetUserEmail,
  });
  const { user, isAdmin } = useAuth();
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldScrollToBottomRef = useRef<boolean>(true);
  const previousMessagesLengthRef = useRef<number>(0);

  // Group messages by date
  const messageGroups: MessageGroup[] = groupMessagesByDate(messages);

  const scrollToBottom = useCallback((smooth: boolean = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollToBottomRef.current = isNearBottom;
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const currentLength = messages.length;
    const previousLength = previousMessagesLengthRef.current;

    if (currentLength > previousLength && shouldScrollToBottomRef.current) {
      setTimeout(() => scrollToBottom(true), 100);
    }

    previousMessagesLengthRef.current = currentLength;
  }, [messages.length, scrollToBottom]);

  // Initial scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isLoading, scrollToBottom]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Clear selected image
  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !isAdmin) {
      toast.error('Please login to send messages');
      return;
    }

    // Send image if selected
    if (selectedImage) {
      const success = await sendImageMessage(selectedImage, targetUserEmail);
      if (success) {
        clearSelectedImage();
        setTimeout(() => scrollToBottom(true), 100);
      } else {
        toast.error('Failed to send image');
      }
      return;
    }

    // Send text message
    if (!message.trim()) return;

    try {
      chatMessageSchema.parse(message);
      const success = await sendMessage(message, targetUserEmail);
      if (success) {
        setMessage('');
        setTimeout(() => scrollToBottom(true), 100);
      } else {
        toast.error('Failed to send message');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-gray-400">Loading chat...</div>
        </div>
      </div>
    );
  }

  const currentUserEmail = user?.email || (isAdmin ? 'admin' : '');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {showHeader && (
        <div className="bg-bg-secondary border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-gray-400 hover:text-primary transition p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="flex-1">
              {isAdmin && targetUserEmail ? (
                <p className="text-sm text-gray-400">
                  Chat with <span className="text-primary font-heading">{targetUserEmail}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  Chat with admin support. We'll respond as soon as possible.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-heading text-gray-300 mb-2">No messages yet</h3>
            <p className="text-gray-500 font-body">
              {isAdmin ? 'Start responding to this user' : 'Start a conversation with admin support'}
            </p>
          </div>
        ) : (
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
                  const isMsgFromAdmin = Boolean(msg.is_admin);
                  
                  // Determine if message is from current user
                  // For regular users: admin messages are never "own messages"
                  // For admins: only their own admin messages are "own messages"
                  let isOwnMessage = false;
                  if (isAdmin) {
                    // Admin viewing: admin messages are "own messages"
                    isOwnMessage = isMsgFromAdmin;
                  } else {
                    // Regular user: only their own messages (not admin) are "own messages"
                    isOwnMessage = !isMsgFromAdmin && msg.user_email === currentUserEmail;
                  }
                  
                  const showAvatar = !isOwnMessage;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`flex items-end gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar */}
                      {showAvatar && (
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-heading text-xs font-bold ${
                          isMsgFromAdmin 
                            ? 'bg-accent text-white border-2 border-accent/50' 
                            : 'bg-gradient-to-br from-primary to-primary/70 text-bg border-2 border-gray-800'
                        }`}>
                          {isMsgFromAdmin ? 'A' : (msg.user_name?.[0]?.toUpperCase() || msg.user_email[0])}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        {/* Username */}
                        {!isOwnMessage && (
                          <div className="text-xs text-gray-400 mb-1 px-2 flex items-center gap-1">
                            <span className="font-body">
                              {isMsgFromAdmin ? 'Admin' : (msg.user_name || msg.user_email)}
                            </span>
                            {isMsgFromAdmin && (
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
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-bg rounded-br-md shadow-lg shadow-primary/20'
                              : isMsgFromAdmin
                              ? 'bg-gray-800 text-white border-l-4 border-accent rounded-bl-md shadow-lg'
                              : 'bg-bg-secondary text-white border border-gray-700 rounded-bl-md'
                          }`}
                          title={formatFullTimestamp(msg.timestamp)}
                        >
                          {isOwnMessage && (
                            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-sm -z-10"></div>
                          )}
                          {isMsgFromAdmin && !isOwnMessage && (
                            <div className="absolute inset-0 rounded-2xl bg-accent/5 -z-10"></div>
                          )}

                          {/* Image Message */}
                          {msg.message_type === 'image' && msg.image_url && (
                            <div 
                              className="cursor-pointer"
                              onClick={() => setExpandedImage(msg.image_url || null)}
                            >
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="max-w-full max-h-64 rounded-lg object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Text Message */}
                          {msg.message && (
                            <p className="text-sm font-body break-words leading-relaxed">
                              {msg.message}
                            </p>
                          )}

                          {/* Timestamp */}
                          <div className={`text-[10px] mt-1.5 ${
                            isOwnMessage 
                              ? 'text-bg/70' 
                              : isMsgFromAdmin 
                              ? 'text-gray-400' 
                              : 'text-gray-500'
                          }`}>
                            {formatMessageTime(msg.timestamp)}
                          </div>
                        </motion.div>
                      </div>

                      {/* Spacer for own messages */}
                      {isOwnMessage && <div className="flex-shrink-0 w-8"></div>}
                    </motion.div>
                  );
                })}
              </React.Fragment>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="border-t border-gray-800 bg-bg-secondary p-3">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Selected image"
              className="max-h-24 rounded-lg object-cover"
            />
            <button
              onClick={clearSelectedImage}
              className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-1 hover:bg-red-600 transition"
            >
              <HiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSend} className="border-t border-gray-800 bg-bg-secondary/50 backdrop-blur-sm p-4">
        <div className="flex gap-2 items-end">
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-shrink-0 p-3 bg-bg-secondary border border-gray-700 rounded-xl text-gray-400 hover:text-primary hover:border-primary transition disabled:opacity-50"
          >
            <HiPhotograph className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={selectedImage ? 'Add a caption (optional)...' : 'Type a message...'}
              className="w-full bg-bg-secondary border border-gray-700 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body text-white placeholder-gray-500"
              maxLength={500}
              autoComplete="off"
              disabled={isUploading}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
              {message.length}/500
            </div>
          </div>

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={(!message.trim() && !selectedImage) || isUploading || (!user && !isAdmin)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-br from-primary to-accent w-12 h-12 rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-600 [&>svg]:!fill-black [&>svg]:!text-black [&>svg]:!stroke-none"
            aria-label="Send message"
            style={{ color: 'transparent' }}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-bg border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <HiPaperAirplane 
                className="text-2xl rotate-[90deg] !fill-black !text-black" 
                style={{ 
                  fill: '#000000', 
                  color: '#000000',
                  stroke: 'none'
                }} 
              />
            )}
          </motion.button>
        </div>
      </form>

      {/* Expanded Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-full max-h-full"
            >
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-4 -right-4 bg-accent text-white rounded-full p-2 hover:bg-red-600 transition z-10"
              >
                <HiX className="w-6 h-6" />
              </button>
              <img
                src={expandedImage}
                alt="Expanded image"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
