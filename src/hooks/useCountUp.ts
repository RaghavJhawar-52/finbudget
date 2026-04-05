"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 → target using an ease-out cubic curve.
 * Re-animates whenever `target` changes.
 */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const rafRef   = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef  = useRef<number>(0);

  useEffect(() => {
    fromRef.current  = value;          // animate from current displayed value
    startRef.current = 0;              // reset start time

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed  = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic: decelerates nicely
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = fromRef.current + (target - fromRef.current) * eased;

      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(target); // lock to exact value at end
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
