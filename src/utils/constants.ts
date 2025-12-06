export const MIN_WITHDRAW = 100;
export const MAX_OTP_ATTEMPTS = 3;
export const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  ADMIN_DASHBOARD: '/admin',
  ADMIN_TOURNAMENTS: '/admin/tournaments',
  ADMIN_USERS: '/admin/users',
  ADMIN_PAYMENTS: '/admin/payments',
} as const;


