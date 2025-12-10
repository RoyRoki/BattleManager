import React, { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { firestore } from '../../services/firebaseService';
import { Payment } from '../../types';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  HiTrendingUp,
  HiTrendingDown,
  HiCurrencyDollar,
  HiChartBar,
} from 'react-icons/hi';
import {
  calculateTotals,
  filterByDateRange,
  groupByDateRange,
  formatCurrency,
  formatDate,
  getPaymentTypeDistribution,
  DateRange,
  DateRangeFilter,
} from '../../utils/analytics';
import { Select } from '../../shared/components/ui/Select';

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'accent' | 'green' | 'yellow';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, trend }) => {
  const colorConfig = {
    primary: {
      border: 'border-primary',
      text: 'text-primary',
      iconBg: 'border-primary text-white',
      hover: 'hover:border-primary hover:shadow-[0_0_20px_rgba(255,186,0,0.3)]',
    },
    accent: {
      border: 'border-accent',
      text: 'text-accent',
      iconBg: 'border-accent text-white',
      hover: 'hover:border-accent hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]',
    },
    green: {
      border: 'border-green-500',
      text: 'text-green-400',
      iconBg: 'border-green-500 text-white',
      hover: 'hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
    },
    yellow: {
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      iconBg: 'border-yellow-500 text-white',
      hover: 'hover:border-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
    },
  };

  const config = colorConfig[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-gradient-to-br from-bg-secondary to-bg-tertiary rounded-xl p-6 border-2 transition-all duration-300 overflow-hidden ${config.border} ${config.hover}`}
    >
      {/* Animated background gradient */}
      <div
        className={`absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300 ${
          color === 'primary' ? 'bg-primary' : color === 'accent' ? 'bg-accent' : color === 'green' ? 'bg-green-500' : 'bg-yellow-500'
        }`}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg border-2 bg-transparent ${config.iconBg}`}>
            <Icon className="text-2xl" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.isPositive ? 'text-green-400' : 'text-red-400'
            }`}>
              {trend.isPositive ? (
                <HiTrendingUp className="text-lg" />
              ) : (
                <HiTrendingDown className="text-lg" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm font-body mb-2">{label}</p>
        <p className={`text-3xl font-heading font-bold ${config.text}`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
};

const COLORS = ['#FFBA00', '#FF0040', '#00FF41']; // Primary (yellow), Accent (red), Green

export const AdminAnalytics: React.FC = () => {
  const [payments, loading, error] = useCollection(
    collection(firestore, 'payments')
  ) as unknown as [{ docs: any[] } | null, boolean, Error | undefined];

  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customRange] = useState<DateRangeFilter>({});
  const [groupBy, setGroupBy] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [tableSort, setTableSort] = useState<{
    field: 'date' | 'type' | 'user' | 'amount' | 'status';
    direction: 'asc' | 'desc';
  }>({ field: 'date', direction: 'desc' });
  const [tableFilter, setTableFilter] = useState<{
    type?: Payment['type'];
    status?: Payment['status'];
    search?: string;
  }>({});

  // Process payments data
  const processedPayments = useMemo(() => {
    if (!payments?.docs) return [];

    return payments.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at:
          data.created_at instanceof Date
            ? data.created_at
            : (data.created_at as any)?.toDate?.() || new Date(),
        updated_at:
          data.updated_at instanceof Date
            ? data.updated_at
            : (data.updated_at as any)?.toDate?.() || new Date(),
        approved_at:
          data.approved_at instanceof Date
            ? data.approved_at
            : (data.approved_at as any)?.toDate?.() || undefined,
      } as Payment;
    });
  }, [payments]);

  // Filter payments by date range
  const filteredPayments = useMemo(() => {
    return filterByDateRange(processedPayments, dateRange, customRange);
  }, [processedPayments, dateRange, customRange]);

  // Calculate totals
  const totals = useMemo(() => {
    return calculateTotals(filteredPayments);
  }, [filteredPayments]);

  // Group data for charts
  const groupedData = useMemo(() => {
    return groupByDateRange(filteredPayments, groupBy);
  }, [filteredPayments, groupBy]);

  // Payment type distribution
  const typeDistribution = useMemo(() => {
    const dist = getPaymentTypeDistribution(filteredPayments);
    return [
      { name: 'Add Money', value: dist.add_money, color: COLORS[0] },
      { name: 'Withdrawal', value: dist.withdrawal, color: COLORS[1] },
      { name: 'Tournament Winning', value: dist.tournament_winning, color: COLORS[2] },
    ].filter((item) => item.value > 0);
  }, [filteredPayments]);

  // Filter and sort table data
  const tableData = useMemo(() => {
    let data = [...filteredPayments];

    // Apply filters
    if (tableFilter.type) {
      data = data.filter((p) => p.type === tableFilter.type);
    }
    if (tableFilter.status) {
      data = data.filter((p) => p.status === tableFilter.status);
    }
    if (tableFilter.search) {
      const search = tableFilter.search.toLowerCase();
      data = data.filter(
        (p) =>
          p.user_email?.toLowerCase().includes(search) ||
          p.user_name?.toLowerCase().includes(search)
      );
    }

    // Sort
    data.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (tableSort.field) {
        case 'date':
          aVal = a.created_at;
          bVal = b.created_at;
          break;
        case 'type':
          aVal = a.type || '';
          bVal = b.type || '';
          break;
        case 'user':
          aVal = a.user_name || a.user_email || '';
          bVal = b.user_name || b.user_email || '';
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return tableSort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return tableSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [filteredPayments, tableFilter, tableSort]);

  const handleSort = (field: typeof tableSort.field) => {
    setTableSort({
      field,
      direction:
        tableSort.field === field && tableSort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  if (error) {
    console.error('AdminAnalytics: Firestore error:', error);
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-heading text-primary mb-2 text-glow">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 font-body">Financial insights and transaction analytics</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent bg-opacity-20 border-2 border-accent rounded-xl p-4 mb-6"
          >
            <p className="text-accent font-body font-semibold">
              ⚠️ Unable to load payment data. Please check your connection and refresh the page.
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 font-body">Loading analytics data...</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Date Range Filters */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-bg-secondary border border-primary/30 rounded-lg p-4 mb-6"
            >
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-gray-400 font-body">Time Period:</span>
                {(['last7', 'last30', 'last90', 'all'] as DateRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg font-heading text-sm transition ${
                      dateRange === range
                        ? 'bg-primary text-bg'
                        : 'bg-bg text-gray-400 hover:text-white'
                    }`}
                  >
                    {range === 'last7' ? 'Last 7 Days' : range === 'last30' ? 'Last 30 Days' : range === 'last90' ? 'Last 90 Days' : 'All Time'}
                  </button>
                ))}
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 text-sm">Group By:</span>
                  {(['daily', 'weekly', 'monthly'] as const).map((group) => (
                    <button
                      key={group}
                      onClick={() => setGroupBy(group)}
                      className={`px-3 py-1 rounded-lg text-xs font-heading transition ${
                        groupBy === group
                          ? 'bg-primary text-bg'
                          : 'bg-bg text-gray-400 hover:text-white'
                      }`}
                    >
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Total Credit"
                value={`${formatCurrency(totals.totalCredit)} pts`}
                icon={HiTrendingUp}
                color="green"
              />
              <StatCard
                label="Total Debit"
                value={`${formatCurrency(totals.totalDebit)} pts`}
                icon={HiTrendingDown}
                color="accent"
              />
              <StatCard
                label="Total Commission"
                value={`${formatCurrency(totals.totalCommission)} pts`}
                icon={HiCurrencyDollar}
                color="yellow"
              />
              <StatCard
                label="Net Balance"
                value={`${formatCurrency(totals.netBalance)} pts`}
                icon={HiChartBar}
                color={totals.netBalance >= 0 ? 'primary' : 'accent'}
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border-2 border-primary/30 rounded-lg p-4 text-center hover:border-primary/50 transition"
              >
                <p className="text-gray-400 text-sm mb-1 font-body">Total Transactions</p>
                <p className="text-2xl font-heading text-primary font-bold">{totals.transactionCount}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border-2 border-green-500/30 rounded-lg p-4 text-center hover:border-green-500/50 transition"
              >
                <p className="text-gray-400 text-sm mb-1 font-body">Approved</p>
                <p className="text-2xl font-heading text-green-400 font-bold">{totals.approvedCount}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border-2 border-yellow-500/30 rounded-lg p-4 text-center hover:border-yellow-500/50 transition"
              >
                <p className="text-gray-400 text-sm mb-1 font-body">Pending</p>
                <p className="text-2xl font-heading text-yellow-400 font-bold">{totals.pendingCount}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-bg-secondary to-bg-tertiary border-2 border-red-500/30 rounded-lg p-4 text-center hover:border-red-500/50 transition"
              >
                <p className="text-gray-400 text-sm mb-1 font-body">Rejected</p>
                <p className="text-2xl font-heading text-red-400 font-bold">{totals.rejectedCount}</p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Credit Over Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-bg-secondary border border-primary/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-primary mb-4">Credit Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={groupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value, groupBy)}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FFBA00',
                          borderRadius: '8px',
                          color: '#FFBA00',
                        }}
                        itemStyle={{
                          color: '#FFBA00',
                        }}
                        labelStyle={{
                          color: '#FFBA00',
                        }}
                        formatter={(value: number) => [`${formatCurrency(value)} pts`, 'Credit']}
                        labelFormatter={(label) => `Date: ${formatDate(label, groupBy)}`}
                      />
                    <Area
                      type="monotone"
                      dataKey="credit"
                      stroke="#00FF41"
                      fill="#00FF41"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Debit Over Time */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-bg-secondary border border-accent/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-accent mb-4">Debit Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={groupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value, groupBy)}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FF0040',
                          borderRadius: '8px',
                          color: '#FF0040',
                        }}
                        itemStyle={{
                          color: '#FF0040',
                        }}
                        labelStyle={{
                          color: '#FF0040',
                        }}
                        formatter={(value: number) => [`${formatCurrency(value)} pts`, 'Debit']}
                        labelFormatter={(label) => `Date: ${formatDate(label, groupBy)}`}
                      />
                    <Area
                      type="monotone"
                      dataKey="debit"
                      stroke="#FF0040"
                      fill="#FF0040"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Net Balance Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-bg-secondary border border-primary/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-primary mb-4">Net Balance Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={groupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value, groupBy)}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FFBA00',
                          borderRadius: '8px',
                          color: '#FFBA00',
                        }}
                        itemStyle={{
                          color: '#FFBA00',
                        }}
                        labelStyle={{
                          color: '#FFBA00',
                        }}
                        formatter={(value: number) => [`${formatCurrency(value)} pts`, 'Net Balance']}
                        labelFormatter={(label) => `Date: ${formatDate(label, groupBy)}`}
                      />
                    <Line
                      type="monotone"
                      dataKey="netBalance"
                      stroke="#FFBA00"
                      strokeWidth={2}
                      dot={{ fill: '#FFBA00', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Commission Earned */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-bg-secondary border border-yellow-500/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-yellow-400 mb-4">Commission Earned</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value, groupBy)}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FFD700',
                          borderRadius: '8px',
                          color: '#FFD700',
                        }}
                        itemStyle={{
                          color: '#FFD700',
                        }}
                        labelStyle={{
                          color: '#FFD700',
                        }}
                        formatter={(value: number) => [`${formatCurrency(value)} pts`, 'Commission']}
                        labelFormatter={(label) => `Date: ${formatDate(label, groupBy)}`}
                      />
                    <Bar dataKey="commission" fill="#FFD700" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Transaction Volume */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-bg-secondary border border-primary/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-primary mb-4">Transaction Volume</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={groupedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#999', fontSize: 12 }}
                      tickFormatter={(value) => formatDate(value, groupBy)}
                    />
                    <YAxis tick={{ fill: '#999', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FFBA00',
                          borderRadius: '8px',
                          color: '#FFBA00',
                        }}
                        itemStyle={{
                          color: '#FFBA00',
                        }}
                        labelStyle={{
                          color: '#FFBA00',
                        }}
                        formatter={(value: number) => [value, 'Transactions']}
                        labelFormatter={(label) => `Date: ${formatDate(label, groupBy)}`}
                      />
                    <Bar dataKey="transactionCount" fill="#FFBA00" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Payment Type Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-bg-secondary border border-primary/30 rounded-lg p-6"
              >
                <h3 className="text-xl font-heading text-primary mb-4">Payment Type Distribution</h3>
                {typeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1A1A1A',
                          border: '1px solid #FFBA00',
                          borderRadius: '8px',
                          color: '#FFBA00',
                        }}
                        itemStyle={{
                          color: '#FFBA00',
                        }}
                        labelStyle={{
                          color: '#FFBA00',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    No data available
                  </div>
                )}
              </motion.div>
            </div>

            {/* Transaction History Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-bg-secondary border border-primary/30 rounded-lg p-6"
            >
              <h3 className="text-xl font-heading text-primary mb-4">Transaction History</h3>

              {/* Table Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by user..."
                  value={tableFilter.search || ''}
                  onChange={(e) => setTableFilter({ ...tableFilter, search: e.target.value })}
                  className="flex-1 min-w-[200px] bg-bg border border-primary/30 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary hover:border-primary/50 transition"
                />
                <Select
                  options={[
                    { value: '', label: 'All Types' },
                    { value: 'add_money', label: 'Add Money' },
                    { value: 'withdrawal', label: 'Withdrawal' },
                    { value: 'tournament_winning', label: 'Tournament Winning' },
                  ]}
                  value={tableFilter.type || ''}
                  placeholder="All Types"
                  onChange={(value) =>
                    setTableFilter({
                      ...tableFilter,
                      type: value ? (value as Payment['type']) : undefined,
                    })
                  }
                  className="min-w-[150px]"
                />
                <Select
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'rejected', label: 'Rejected' },
                  ]}
                  value={tableFilter.status || ''}
                  placeholder="All Status"
                  onChange={(value) =>
                    setTableFilter({
                      ...tableFilter,
                      status: value ? (value as Payment['status']) : undefined,
                    })
                  }
                  className="min-w-[150px]"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-heading cursor-pointer hover:text-primary"
                        onClick={() => handleSort('date')}
                      >
                        Date {tableSort.field === 'date' && (tableSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-heading cursor-pointer hover:text-primary"
                        onClick={() => handleSort('type')}
                      >
                        Type {tableSort.field === 'type' && (tableSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-heading cursor-pointer hover:text-primary"
                        onClick={() => handleSort('user')}
                      >
                        User {tableSort.field === 'user' && (tableSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-right py-3 px-4 text-gray-400 font-heading cursor-pointer hover:text-primary"
                        onClick={() => handleSort('amount')}
                      >
                        Amount {tableSort.field === 'amount' && (tableSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="text-left py-3 px-4 text-gray-400 font-heading cursor-pointer hover:text-primary"
                        onClick={() => handleSort('status')}
                      >
                        Status {tableSort.field === 'status' && (tableSort.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length > 0 ? (
                      tableData.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-b border-gray-800 hover:bg-bg-tertiary transition"
                        >
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {payment.created_at.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-heading ${
                                payment.type === 'add_money'
                                  ? 'bg-green-900/30 text-green-400'
                                  : payment.type === 'withdrawal'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-blue-900/30 text-blue-400'
                              }`}
                            >
                              {payment.type === 'add_money'
                                ? 'Add Money'
                                : payment.type === 'withdrawal'
                                ? 'Withdrawal'
                                : 'Tournament'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {payment.user_name || payment.user_email}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-white font-heading">
                              {formatCurrency(payment.amount)} pts
                            </div>
                            {payment.type === 'withdrawal' && payment.commission_amount && (
                              <div className="text-xs text-gray-500">
                                Commission: {formatCurrency(payment.commission_amount)} pts
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-heading ${
                                payment.status === 'approved'
                                  ? 'bg-green-900/30 text-green-400'
                                  : payment.status === 'pending'
                                  ? 'bg-yellow-900/30 text-yellow-400'
                                  : 'bg-red-900/30 text-red-400'
                              }`}
                            >
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No transactions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

