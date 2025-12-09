/**
 * Generate or modify merchant payment URL with amount
 * @param merchantUrl - Merchant payment URL (e.g., upi://pay?pa=gpay-xxx@okbizaxis&mc=5399&pn=Merchant)
 * @param amount - Amount to pay
 * @returns UPI payment string with amount injected/replaced
 */
export const generateMerchantPaymentUrl = (
  merchantUrl: string,
  amount: number
): string => {
  try {
    // UPI URLs use custom protocol (upi://pay?...), so we need to parse manually
    const match = merchantUrl.match(/^(upi:\/\/pay\?)(.*)$/);
    
    if (!match) {
      throw new Error('Invalid merchant payment URL format. Must start with "upi://pay?"');
    }

    const urlPrefix = match[1]; // "upi://pay?"
    const queryString = match[2]; // The query parameters

    // Parse query parameters
    const params = new URLSearchParams(queryString);

    // Set or update the amount parameter
    params.set('am', amount.toString());

    // Ensure currency is set to INR if not present
    if (!params.has('cu')) {
      params.set('cu', 'INR');
    }

    // Reconstruct the URL
    return `${urlPrefix}${params.toString()}`;
  } catch (error: any) {
    console.error('Error parsing merchant URL:', error);
    throw new Error(`Invalid merchant payment URL: ${error.message}`);
  }
};

/**
 * Generate UPI payment string for adding money
 * @param upiId - UPI ID (e.g., 9800881300@upi)
 * @param upiName - Merchant/UPI name (e.g., RokiRoy)
 * @param amount - Amount to pay
 * @param transactionNote - Transaction note
 * @returns UPI payment string
 */
export const generateAddMoneyUPIString = (
  upiId: string,
  upiName: string,
  amount: number,
  transactionNote: string = 'Add Money to BattleManager'
): string => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: upiName,
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

/**
 * Payment app configurations
 */
export interface PaymentApp {
  name: string;
  packageName: string;
  scheme: string;
}

export const PAYMENT_APPS: PaymentApp[] = [
  {
    name: 'Google Pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    scheme: 'upi',
  },
  {
    name: 'PhonePe',
    packageName: 'com.phonepe.app',
    scheme: 'upi',
  },
  {
    name: 'Paytm',
    packageName: 'net.one97.paytm',
    scheme: 'upi',
  },
  {
    name: 'BHIM',
    packageName: 'in.org.npci.upiapp',
    scheme: 'upi',
  },
];

/**
 * Generate payment app intent URL
 * @param app - Payment app configuration
 * @param upiId - UPI ID (e.g., 9800881300@upi)
 * @param upiName - Merchant/UPI name (e.g., RokiRoy)
 * @param amount - Amount to pay
 * @param transactionNote - Transaction note
 * @returns Intent URL for the payment app
 */
export const generatePaymentAppIntent = (
  app: PaymentApp,
  upiId: string,
  upiName: string,
  amount: number,
  transactionNote: string = 'Add Money to BattleManager'
): string => {
  // Build query parameters
  const queryParams = new URLSearchParams({
    pa: upiId,
    pn: upiName,
    am: amount.toString(),
    cu: 'INR',
    tn: transactionNote,
  });

  // Format: intent://pay?pa=...#Intent;scheme=upi;package=...;end
  return `intent://pay?${queryParams.toString()}#Intent;scheme=${app.scheme};package=${app.packageName};end`;
};


