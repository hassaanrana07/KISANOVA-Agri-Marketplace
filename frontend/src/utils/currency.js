/**
 * Standard PKR Currency Formatting Utility
 * Kisanova Agricultural Marketplace
 */

export const formatPKR = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return 'PKR 0';
  }

  const num = Number(amount);
  const { includeDecimal = false, unit = null } = options;

  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: includeDecimal ? 2 : (num % 1 !== 0 ? 2 : 0),
    maximumFractionDigits: 2
  });

  const base = `PKR ${formatted}`;
  return unit ? `${base} / ${unit}` : base;
};

export const parsePKR = (amountString) => {
  if (!amountString) return 0;
  const cleaned = String(amountString).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export default formatPKR;
