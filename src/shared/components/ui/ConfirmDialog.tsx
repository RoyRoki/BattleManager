import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiExclamationCircle, HiCheckCircle, HiXCircle } from 'react-icons/hi';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const variantStyles = {
    primary: 'bg-primary text-bg hover:bg-opacity-80',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };

  const iconConfig = {
    primary: {
      icon: HiExclamationCircle,
      bgColor: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    danger: {
      icon: HiXCircle,
      bgColor: 'bg-red-600/20',
      iconColor: 'text-red-400',
    },
    success: {
      icon: HiCheckCircle,
      bgColor: 'bg-green-600/20',
      iconColor: 'text-green-400',
    },
  };

  const Icon = iconConfig[confirmVariant].icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary border border-primary/30 rounded-lg p-6 max-w-md w-full"
            >
              {/* Icon and Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-16 h-16 ${iconConfig[confirmVariant].bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-8 h-8 ${iconConfig[confirmVariant].iconColor}`} />
                </div>
                {title && (
                  <h3 className="text-xl font-heading text-primary">{title}</h3>
                )}
              </div>

              {/* Message */}
              <p className="text-gray-300 mb-6">{message}</p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 bg-bg border border-gray-700 text-gray-300 py-2 rounded-lg hover:bg-bg-tertiary transition"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 ${variantStyles[confirmVariant]} py-2 rounded-lg font-heading transition`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

