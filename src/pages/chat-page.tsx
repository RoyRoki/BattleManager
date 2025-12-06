import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from '../components/chat-interface';
import { motion } from 'framer-motion';
import { HiArrowLeft } from 'react-icons/hi';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </motion.button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading text-primary text-glow flex-1"
          >
            Global Chat
          </motion.h1>
        </div>
        <div className="bg-bg-secondary border border-gray-800 rounded-lg h-[calc(100vh-200px)]">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};


