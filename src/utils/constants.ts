export const MIN_WITHDRAW = 100;
export const MAX_OTP_ATTEMPTS = 3;
export const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
export const DEFAULT_WITHDRAWAL_COMMISSION = 3; // 3%
export const PRESET_WITHDRAWAL_AMOUNTS = [100, 200, 500, 1000];

export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  MONEY: '/money',
  CHAT: '/chat',
  SUPPORT: '/support',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  TOURNAMENT_HISTORY: '/tournaments/history',
  ADMIN_LOGIN: '/admin/2026', // Secret admin login route
  ADMIN_DASHBOARD: '/admin',
  ADMIN_TOURNAMENTS: '/admin/tournaments',
  ADMIN_USERS: '/admin/users',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_SUPPORT_CHAT: '/admin/support-chat',
} as const;


