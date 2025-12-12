import { Payment } from '../types';

export type DateRange = 'daily' | 'weekly' | 'monthly' | 'last7' | 'last30' | 'last90' | 'all' | 'custom';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface GroupedData {
  date: string;
  credit: number;
  debit: number;
  commission: number;
  netBalance: number;
  transactionCount: number;
}

export interface AnalyticsTotals {
  totalCredit: number;
  totalDebit: number;
  totalCommission: number;
  netBalance: number;
  transactionCount: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

/**
 * Format currency/points for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Filter payments by date range
 */
export const filterByDateRange = (
  payments: Payment[],
  range: DateRange,
  customRange?: DateRangeFilter
): Payment[] => {
  if (range === 'all') {
    return payments;
  }

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case 'last7':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last30':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last90':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      if (customRange?.startDate && customRange?.endDate) {
        return payments.filter((payment) => {
          const paymentDate = payment.created_at instanceof Date
            ? payment.created_at
            : (payment.created_at as any)?.toDate?.() || new Date();
          return paymentDate >= customRange.startDate! && paymentDate <= customRange.endDate!;
        });
      }
      return payments;
    default:
      return payments;
  }

  return payments.filter((payment) => {
    const paymentDate = payment.created_at instanceof Date
      ? payment.created_at
      : (payment.created_at as any)?.toDate?.() || new Date();
    return paymentDate >= startDate;
  });
};

/**
 * Group transactions by date range (daily, weekly, monthly)
 */
export const groupByDateRange = (
  payments: Payment[],
  range: 'daily' | 'weekly' | 'monthly'
): GroupedData[] => {
  const grouped = new Map<string, GroupedData>();

  payments.forEach((payment) => {
    const paymentDate = payment.created_at instanceof Date
      ? payment.created_at
      : (payment.created_at as any)?.toDate?.() || new Date();

    let key: string;
    const date = new Date(paymentDate);

    switch (range) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        date: key,
        credit: 0,
        debit: 0,
        commission: 0,
        netBalance: 0,
        transactionCount: 0,
      });
    }

    const group = grouped.get(key)!;
    group.transactionCount += 1;

    if (payment.type === 'add_money' && payment.status === 'approved') {
      group.credit += payment.amount;
    } else if (payment.type === 'withdrawal' && payment.status === 'approved') {
      const finalAmount = payment.final_amount || (payment.amount - (payment.commission_amount || 0));
      group.debit += finalAmount;
      group.commission += payment.commission_amount || 0;
    }

    group.netBalance = group.credit - group.debit;
  });

  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Calculate total analytics metrics
 */
export const calculateTotals = (payments: Payment[]): AnalyticsTotals => {
  const totals: AnalyticsTotals = {
    totalCredit: 0,
    totalDebit: 0,
    totalCommission: 0,
    netBalance: 0,
    transactionCount: payments.length,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
  };

  payments.forEach((payment) => {
    // Count by status
    if (payment.status === 'approved') {
      totals.approvedCount += 1;
    } else if (payment.status === 'pending') {
      totals.pendingCount += 1;
    } else if (payment.status === 'rejected') {
      totals.rejectedCount += 1;
    }

    // Calculate financial totals for approved payments only
    if (payment.status === 'approved') {
      if (payment.type === 'add_money') {
        totals.totalCredit += payment.amount;
      } else if (payment.type === 'withdrawal') {
        const finalAmount = payment.final_amount || (payment.amount - (payment.commission_amount || 0));
        totals.totalDebit += finalAmount;
        totals.totalCommission += payment.commission_amount || 0;
      }
    }
  });

  totals.netBalance = totals.totalCredit - totals.totalDebit;

  return totals;
};

/**
 * Get payment type distribution
 */
export const getPaymentTypeDistribution = (payments: Payment[]) => {
  const distribution = {
    add_money: 0,
    withdrawal: 0,
    tournament_winning: 0,
  };

  payments.forEach((payment) => {
    const type = payment.type || 'add_money';
    if (type in distribution) {
      distribution[type as keyof typeof distribution] += 1;
    }
  });

  return distribution;
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string, range: 'daily' | 'weekly' | 'monthly'): string => {
  if (range === 'monthly') {
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  if (range === 'weekly') {
    const date = new Date(dateString);
    const weekEnd = new Date(date);
    weekEnd.setDate(date.getDate() + 6);
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};



