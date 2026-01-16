/**
 * URL helper utilities for navigation
 */

export const getThreadUrl = (threadId: string): string => {
  return `/t/${threadId}`;
};

export const getLandingUrl = (): string => {
  return '/';
};
