/**
 * Generate a unique ID using crypto.randomUUID or fallback
 */
export const idFactory = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};
