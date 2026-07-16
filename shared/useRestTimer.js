import { useEffect, useRef, useState } from "react";

/**
 * Pure countdown state machine. Platform-specific completion side effects
 * (sound, haptics, notifications) are wired by the caller via `onComplete` —
 * this hook only tracks foreground display state and does not survive the
 * JS timer being paused/backgrounded (mobile callers should also schedule a
 * platform notification independently, since backgrounded JS timers stall).
 */
export function useRestTimer(defaultSeconds = 60, onComplete) {
  const [duration, setDuration] = useState(defaultSeconds);
  const [remaining, setRemaining] = useState(defaultSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setIsRunning(false);
          if (onCompleteRef.current) onCompleteRef.current();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const start = (seconds) => {
    const d = seconds ?? duration;
    setDuration(d);
    setRemaining(d);
    setIsRunning(true);
  };
  const pause = () => setIsRunning(false);
  const resume = () => { if (remaining > 0) setIsRunning(true); };
  const reset = () => { setIsRunning(false); setRemaining(duration); };

  return { duration, remaining, isRunning, start, pause, resume, reset, setDuration };
}
