export function isDebugEnabled(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage?.getItem('chat_debug') === '1';
  } catch (err) {
    return false;
  }
}

export function debugLog(...args: any[]) {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.debug(...args);
  }
}

export default debugLog;
