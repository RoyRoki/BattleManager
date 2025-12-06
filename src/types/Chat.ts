export interface ChatMessage {
  id: string;
  user_mobile: string;
  user_name?: string;
  message: string;
  timestamp: Date;
  is_admin?: boolean;
}


