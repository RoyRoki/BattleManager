/**
 * Date utility functions for chat message formatting
 */

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
};

/**
 * Format date separator for chat messages
 * Returns "Today", "Yesterday", or formatted date string
 */
export const formatMessageDate = (date: Date): string => {
  if (isToday(date)) {
    return 'Today';
  }
  
  if (isYesterday(date)) {
    return 'Yesterday';
  }

  // Check if date is within the last 7 days
  const daysDiff = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Format as "Mon, Dec 25, 2024" for older dates
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format message timestamp for display
 * Shows relative time for recent messages, absolute time for older ones
 */
export const formatMessageTime = (date: Date, showSeconds: boolean = false): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Less than 1 minute ago
  if (diffMins < 1) {
    return 'Just now';
  }

  // Less than 1 hour ago
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  // Less than 24 hours ago
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  // Less than 7 days ago
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Older than 7 days - show absolute time
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: 'numeric',
    ...(showSeconds && { second: 'numeric' }),
    hour12: true,
  };

  return date.toLocaleTimeString('en-US', options);
};

/**
 * Format full timestamp (date + time) for message tooltips
 */
export const formatFullTimestamp = (date: Date): string => {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
};

/**
 * Group messages by date for rendering date separators
 * Returns an array of objects with date and messages
 */
export interface MessageGroup {
  date: Date;
  dateLabel: string;
  messages: any[];
}

export const groupMessagesByDate = (messages: any[]): MessageGroup[] => {
  if (messages.length === 0) return [];

  const groups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages.forEach((message) => {
    const messageDate = message.timestamp instanceof Date 
      ? message.timestamp 
      : new Date(message.timestamp);

    // Check if we need a new group
    if (!currentGroup || !isSameDay(currentGroup.date, messageDate)) {
      currentGroup = {
        date: messageDate,
        dateLabel: formatMessageDate(messageDate),
        messages: [message],
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(message);
    }
  });

  return groups;
};

/**
 * Tournament status utilities
 */

/**
 * Get the suggested status for a tournament based on current time
 * This can be used to suggest status updates to admins
 */
export const getSuggestedTournamentStatus = (
  startTime: Date,
  currentStatus: 'upcoming' | 'live' | 'completed' | 'cancelled'
): 'upcoming' | 'live' | 'completed' | 'cancelled' => {
  // Don't change cancelled tournaments
  if (currentStatus === 'cancelled') {
    return 'cancelled';
  }

  const now = new Date();
  const timeDiff = now.getTime() - startTime.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // If tournament hasn't started yet
  if (timeDiff < 0) {
    return 'upcoming';
  }

  // If tournament started less than 24 hours ago, it's live
  if (hoursDiff < 24) {
    return 'live';
  }

  // If tournament started more than 24 hours ago, suggest completed
  return 'completed';
};

/**
 * Check if a tournament should be live based on start time
 */
export const shouldTournamentBeLive = (startTime: Date): boolean => {
  const now = new Date();
  const timeDiff = now.getTime() - startTime.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Tournament is live if it started and less than 24 hours have passed
  return timeDiff >= 0 && hoursDiff < 24;
};

/**
 * Check if a tournament should be completed based on start time
 */
export const shouldTournamentBeCompleted = (startTime: Date): boolean => {
  const now = new Date();
  const timeDiff = now.getTime() - startTime.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Tournament should be completed if more than 24 hours have passed
  return hoursDiff >= 24;
};

