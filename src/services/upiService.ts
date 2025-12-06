// Merchant UPI details
const MERCHANT_UPI_ID = '9800881300@upi';
const MERCHANT_NAME = 'RokiRoy';

/**
 * Generate UPI payment string for adding money
 * @param amount - Amount to pay
 * @param transactionNote - Transaction note
 * @returns UPI payment string
 */
export const generateAddMoneyUPIString = (
  amount: number,
  transactionNote: string = 'Add Money to BattleManager'
): string => {
  const params = new URLSearchParams({
    pa: MERCHANT_UPI_ID,
    pn: MERCHANT_NAME,
    am: amount.toString(),
    cu: 'INR',
    tn: transactionNote,
  });

  return `upi://pay?${params.toString()}`;
};

/**
 * Generate UPI payment string
 * @param upiId - UPI ID (e.g., yourname@paytm)
 * @param amount - Amount to pay
 * @param merchantName - Merchant name
 * @param transactionNote - Transaction note
 * @returns UPI payment string
 */
export const generateUPIString = (
  upiId: string,
  amount: number,
  merchantName: string = 'BattleManager',
  transactionNote: string = 'Tournament Entry'
): string => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: merchantName,
    am: amount.toString(),
    cu: 'INR',
    tn: transactionNote,
  });

  return `upi://pay?${params.toString()}`;
};

/**
 * Generate UPI QR code data URL (for QR code generation)
 * Note: This requires a QR code library like qrcode
 */
export const generateUPIQRData = (
  upiId: string,
  amount: number,
  merchantName: string = 'BattleManager',
  transactionNote: string = 'Tournament Entry'
): string => {
  return generateUPIString(upiId, amount, merchantName, transactionNote);
};


