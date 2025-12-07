import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiChat, HiRefresh, HiSearch, HiX } from 'react-icons/hi';
import { useSupportChat } from '../../hooks/useSupportChat';
import { SupportChatInterface } from '../../components/support-chat-interface';
import { formatMessageTime } from '../../utils/dateUtils';
import { SupportChat } from '../../types';

export const AdminSupportChat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { supportChats, isLoadingChats, loadSupportChats, markMessagesAsRead } = useSupportChat();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Check for user param in URL
  useEffect(() => {
    const userMobile = searchParams.get('user');
    if (userMobile) {
      setSelectedChat(userMobile);
    }
  }, [searchParams]);

  // Mark messages as read when chat is selected
  useEffect(() => {
    if (selectedChat && markMessagesAsRead) {
      markMessagesAsRead(selectedChat);
      // Reload chats to update unread count
      setTimeout(() => {
        loadSupportChats();
      }, 500);
    }
  }, [selectedChat, markMessagesAsRead, loadSupportChats]);

  // Filter chats by search query
  const filteredChats = supportChats.filter((chat) => {
    const query = searchQuery.toLowerCase();
    return (
      chat.user_mobile.toLowerCase().includes(query) ||
      chat.user_name?.toLowerCase().includes(query)
    );
  });

  const handleSelectChat = (userMobile: string) => {
    setSelectedChat(userMobile);
    setSearchParams({ user: userMobile });
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors"
            aria-label="Go back to dashboard"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </motion.button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading text-primary text-glow flex-1"
          >
            Support Chats
          </motion.h1>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={loadSupportChats}
            disabled={isLoadingChats}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors disabled:opacity-50"
            aria-label="Refresh chats"
          >
            <HiRefresh className={`text-xl text-primary ${isLoadingChats ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>

        {/* Desktop Layout: Side-by-side */}
        <div className="hidden lg:flex gap-6 h-[calc(100vh-200px)]">
          {/* Chat List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-1/3 bg-bg-secondary border border-gray-800 rounded-xl overflow-hidden flex flex-col"
          >
            {/* Search */}
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-bg border border-gray-700 rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:border-primary text-white placeholder-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <HiX />
                  </button>
                )}
              </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingChats ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <HiChat className="text-4xl mb-2" />
                  <p>{searchQuery ? 'No chats found' : 'No support chats yet'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredChats.map((chat) => (
                    <ChatListItem
                      key={chat.user_mobile}
                      chat={chat}
                      isSelected={selectedChat === chat.user_mobile}
                      onClick={() => handleSelectChat(chat.user_mobile)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Chat View */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 bg-bg-secondary border border-gray-800 rounded-xl overflow-hidden"
          >
            {selectedChat ? (
              <SupportChatInterface
                targetUserMobile={selectedChat}
                showHeader={true}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <HiChat className="text-6xl mb-4" />
                <p className="text-xl font-heading">Select a chat to view</p>
                <p className="text-sm mt-2">Choose a user from the list to start responding</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Mobile Layout: Full screen toggle */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait">
            {selectedChat ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-bg-secondary border border-gray-800 rounded-xl h-[calc(100vh-200px)] overflow-hidden"
              >
                <SupportChatInterface
                  targetUserMobile={selectedChat}
                  onBack={handleBackToList}
                  showHeader={true}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="bg-bg-secondary border border-gray-800 rounded-xl overflow-hidden"
              >
                {/* Search */}
                <div className="p-4 border-b border-gray-800">
                  <div className="relative">
                    <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="w-full bg-bg border border-gray-700 rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:border-primary text-white placeholder-gray-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <HiX />
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat List */}
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {isLoadingChats ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                      <HiChat className="text-4xl mb-2" />
                      <p>{searchQuery ? 'No chats found' : 'No support chats yet'}</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800">
                      {filteredChats.map((chat) => (
                        <ChatListItem
                          key={chat.user_mobile}
                          chat={chat}
                          isSelected={false}
                          onClick={() => handleSelectChat(chat.user_mobile)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// Chat List Item Component
interface ChatListItemProps {
  chat: SupportChat;
  isSelected: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, isSelected, onClick }) => {
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(255, 186, 0, 0.1)' }}
      onClick={onClick}
      className={`w-full p-4 text-left transition-colors ${
        isSelected ? 'bg-primary/20 border-l-4 border-primary' : 'hover:bg-gray-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-bg font-heading text-lg font-bold">
          {chat.user_name?.[0]?.toUpperCase() || chat.user_mobile[0]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-white truncate">
              {chat.user_name || chat.user_mobile}
            </span>
            {chat.last_message_time && (
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatMessageTime(chat.last_message_time)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <p className="text-sm text-gray-400 truncate flex-1">
              {chat.last_message || 'No messages'}
            </p>
            {chat.unread_count ? (
              <span className="flex-shrink-0 bg-accent text-white text-xs font-heading px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {chat.unread_count > 99 ? '99+' : chat.unread_count}
              </span>
            ) : chat.has_admin_reply ? (
              <span className="text-xs text-primary">✓ Replied</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 mt-1">{chat.user_mobile}</p>
        </div>
      </div>
    </motion.button>
  );
};


