import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { useAuth } from '../contexts/AuthContext';
import { chatMessageSchema } from '../utils/validations';
import toast from 'react-hot-toast';

export const ChatInterface: React.FC = () => {
  const { messages, isLoading, sendMessage } = useRealtimeChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid message');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${
                msg.user_mobile === user?.mobile_no ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.user_mobile === user?.mobile_no
                    ? 'bg-primary text-bg'
                    : msg.is_admin
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-white'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {msg.user_name || msg.user_mobile}
                </div>
                <div>{msg.message}</div>
                <div className="text-xs opacity-50 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-800 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-bg-secondary border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-primary"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!message.trim() || !user}
            className="bg-primary text-bg px-6 py-2 rounded-lg font-heading hover:bg-opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};


