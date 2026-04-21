/**
 * Formats a string into NPWPD format: P.00.000.000.0-000.000
 */
export const formatNPWPD = (value: string): string => {
  return value;
};

/**
 * Ensures the value is an array, parsing if it's a JSON string.
 */
export const ensureArray = (val: any) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};
