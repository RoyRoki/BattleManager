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


