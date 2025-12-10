import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiChevronDown } from 'react-icons/hi';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  placeholder = 'Select...',
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-bg border border-primary/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition flex items-center justify-between hover:border-primary/50"
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <HiChevronDown
          className={`text-xl text-primary transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-10 md:hidden"
            />
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 w-full mt-2 bg-bg-secondary border border-primary/30 rounded-lg shadow-lg overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      value === option.value
                        ? 'bg-bg-tertiary text-primary font-heading border-l-2 border-primary'
                        : 'text-gray-300 hover:bg-bg-tertiary hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

