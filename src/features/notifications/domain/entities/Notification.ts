export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  user_mobile: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
  updated_at: Date;
  metadata?: {
    tournament_id?: string;
    payment_id?: string;
    [key: string]: any;
  };
}

