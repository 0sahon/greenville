/**
 * Format a number as Nigerian Naira.
 * @param amount  The numeric amount (e.g. 50000)
 * @param symbol  Currency symbol to prepend (default '₦')
 */
export function formatNaira(amount: number, symbol = '₦'): string {
  return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
