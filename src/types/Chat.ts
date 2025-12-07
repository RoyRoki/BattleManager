export interface ChatMessage {
  id: string;
  user_email: string;
  user_name?: string;
  message: string;
  timestamp: Date;
  is_admin?: boolean;
  avatar_url?: string;
  user_badge?: string;
  image_url?: string;
  message_type?: 'text' | 'image';
}

export interface SupportChat {
  user_email: string;
  user_name?: string;
  last_message?: string;
  last_message_time?: Date;
  unread_count?: number;
  has_admin_reply?: boolean;
}


