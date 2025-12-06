import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';
import { SupportChatInterface } from '../components/support-chat-interface';
import { useAuth } from '../contexts/AuthContext';

const faqs = [
  {
    question: 'How do I enroll in a tournament?',
    answer:
      'Browse available tournaments on the Home page, click on a tournament to view details, and click "Enroll Now" if you have sufficient points.',
  },
  {
    question: 'How do I add money to my account?',
    answer:
      'Go to the Money page, select "Add" tab, enter the amount, upload payment proof, and submit. Admin will approve and credit points to your account.',
  },
  {
    question: 'How do I withdraw money?',
    answer:
      'Go to the Money page, select "Withdraw" tab, enter amount (minimum 100 points), provide your UPI ID, and submit. Admin will process the withdrawal.',
  },
  {
    question: 'When will I receive tournament credentials?',
    answer:
      'Tournament credentials are revealed at the scheduled reveal time. Make sure you are enrolled in the tournament before the start time.',
  },
  {
    question: 'What if I have insufficient points?',
    answer:
      'You can add money by uploading payment proof. Once approved by admin, points will be credited to your account.',
  },
];

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'faq' | 'chat'>('faq');

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button and Title */}
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-secondary border border-gray-800 hover:border-primary transition-colors"
            aria-label="Go back"
          >
            <HiArrowLeft className="text-xl text-primary" />
          </motion.button>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading text-primary text-glow flex-1"
          >
            Support & FAQ
          </motion.h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-2 rounded-lg font-heading transition ${
              activeTab === 'faq'
                ? 'bg-primary text-bg'
                : 'bg-bg-secondary text-gray-400 hover:text-white'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-lg font-heading transition ${
              activeTab === 'chat'
                ? 'bg-primary text-bg'
                : 'bg-bg-secondary text-gray-400 hover:text-white'
            }`}
          >
            Chat with Admin
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'faq' ? (
          <>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-bg-secondary border border-gray-800 rounded-lg p-6"
                >
                  <h3 className="text-lg font-heading text-primary mb-2">{faq.question}</h3>
                  <p className="text-gray-300">{faq.answer}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 bg-bg-secondary border border-primary rounded-lg p-6"
            >
              <h3 className="text-xl font-heading text-primary mb-4">Need More Help?</h3>
              <p className="text-gray-300 mb-4">
                If you couldn't find the answer you're looking for, use the "Chat with Admin" tab to
                get one-on-one support from our team.
              </p>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-secondary border border-gray-800 rounded-lg h-[calc(100vh-300px)] min-h-[500px]"
          >
            {user ? (
              <SupportChatInterface />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-gray-400 text-lg mb-2">Please login to chat with admin</p>
                  <p className="text-gray-500 text-sm">Login to start a conversation</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};


