// hooks/useThrottle.ts
import { useState, useEffect, useRef } from 'react';

/**
 * A hook that throttles a value.
 * Useful for scroll events, resize events, and other frequent updates.
 * 
 * @param value - The value to throttle
 * @param limit - The throttle limit in milliseconds (default: 300ms)
 * @returns The throttled value
 * 
 * @example
 * ```tsx
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledScroll = useThrottle(scrollPosition, 200);
 * ```
 */
export function useThrottle<T>(value: T, limit: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (now - lastRun.current >= limit) {
      setThrottledValue(value);
      lastRun.current = now;
    }
  }, [value, limit]);

  return throttledValue;
}