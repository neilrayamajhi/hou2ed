import { useState, useEffect, useCallback } from "react";
import { AUTH_CONSTANTS } from "../constants/auth.constants";

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
  isLocked: boolean;
  remainingAttempts: number;
  timeUntilUnlock: number;
}

export function useRateLimit(
  key: string,
  maxAttempts = AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS,
  lockoutDuration = AUTH_CONSTANTS.LOGIN_LOCKOUT_DURATION_MS,
) {
  const [state, setState] = useState<RateLimitState>({
    attempts: 0,
    lockedUntil: null,
    isLocked: false,
    remainingAttempts: maxAttempts,
    timeUntilUnlock: 0,
  });

  // Load state from storage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        // In production, use AsyncStorage or SecureStore
        const storedState = localStorage.getItem(`rateLimit_${key}`);
        if (storedState) {
          const parsed = JSON.parse(storedState);
          const now = Date.now();

          if (parsed.lockedUntil && parsed.lockedUntil > now) {
            setState({
              ...parsed,
              isLocked: true,
              timeUntilUnlock: Math.ceil((parsed.lockedUntil - now) / 1000),
            });
          } else if (parsed.lockedUntil && parsed.lockedUntil <= now) {
            // Lockout has expired, reset
            resetAttempts();
          } else {
            setState({
              ...parsed,
              remainingAttempts: maxAttempts - parsed.attempts,
            });
          }
        }
      } catch (error) {
        console.error("Error loading rate limit state:", error);
      }
    };

    loadState();
  }, [key, maxAttempts]);

  // Update countdown timer
  useEffect(() => {
    if (!state.isLocked || !state.lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeRemaining = state.lockedUntil
        ? Math.ceil((state.lockedUntil - now) / 1000)
        : 0;

      if (timeRemaining <= 0) {
        resetAttempts();
        clearInterval(interval);
      } else {
        setState((prev) => ({ ...prev, timeUntilUnlock: timeRemaining }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isLocked, state.lockedUntil]);

  const incrementAttempts = useCallback(() => {
    setState((prev) => {
      const newAttempts = prev.attempts + 1;
      const isNowLocked = newAttempts >= maxAttempts;
      const lockedUntil = isNowLocked
        ? Date.now() + lockoutDuration
        : prev.lockedUntil;

      const newState = {
        attempts: newAttempts,
        lockedUntil,
        isLocked: isNowLocked,
        remainingAttempts: Math.max(0, maxAttempts - newAttempts),
        timeUntilUnlock: isNowLocked ? Math.ceil(lockoutDuration / 1000) : 0,
      };

      // Save to storage
      try {
        localStorage.setItem(
          `rateLimit_${key}`,
          JSON.stringify({
            attempts: newState.attempts,
            lockedUntil: newState.lockedUntil,
          }),
        );
      } catch (error) {
        console.error("Error saving rate limit state:", error);
      }

      return newState;
    });
  }, [key, maxAttempts, lockoutDuration]);

  const resetAttempts = useCallback(() => {
    setState({
      attempts: 0,
      lockedUntil: null,
      isLocked: false,
      remainingAttempts: maxAttempts,
      timeUntilUnlock: 0,
    });

    try {
      localStorage.removeItem(`rateLimit_${key}`);
    } catch (error) {
      console.error("Error clearing rate limit state:", error);
    }
  }, [key, maxAttempts]);

  const checkRateLimit = useCallback((): boolean => {
    if (state.isLocked) {
      const now = Date.now();
      if (state.lockedUntil && state.lockedUntil > now) {
        return false; // Still locked
      } else {
        // Lockout expired
        resetAttempts();
        return true;
      }
    }
    return true; // Not locked
  }, [state.isLocked, state.lockedUntil, resetAttempts]);

  return {
    isLocked: state.isLocked,
    remainingAttempts: state.remainingAttempts,
    timeUntilUnlock: state.timeUntilUnlock,
    incrementAttempts,
    resetAttempts,
    checkRateLimit,
  };
}
