"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

/**
 * Check circle with two gestures: quick click marks the task done; press-and-hold
 * (750ms, with a progress ring) fires onLongPress — used to toggle In Progress.
 * Shared by the Today panel and the vault so both screens behave identically.
 */
export function LongPressCheck({
  task,
  onMarkDone,
  onLongPress,
  isDone = false,
  className,
}: {
  task: Task;
  onMarkDone: (t: Task) => void;
  onLongPress: (t: Task) => void;
  isDone?: boolean;
  className?: string;
}) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);
  const DURATION = 750;

  const startPress = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    firedRef.current = false;
    setPressing(true);
    setProgress(0);
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(elapsed / DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        firedRef.current = true;
        setPressing(false);
        setProgress(0);
        onLongPress(task);
      }
    }, 30);
  }, [task, onLongPress]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!firedRef.current && pressing) {
      onMarkDone(task);
    }
    setPressing(false);
    setProgress(0);
  }, [pressing, task, onMarkDone]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startPress();
      }}
      onMouseUp={endPress}
      onMouseLeave={() => {
        if (pressing) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setPressing(false);
          setProgress(0);
        }
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startPress();
      }}
      onTouchEnd={endPress}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center justify-center w-5 h-5 flex-shrink-0 transition-colors relative",
        isDone
          ? "text-green-400"
          : "text-muted-foreground group-hover/task:text-green-400 group-hover:text-green-400 hover:!text-green-400",
        className
      )}
    >
      {pressing ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            opacity="0.2"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="rgb(74, 222, 128)"
            strokeWidth="1.5"
            strokeDasharray={`${progress * 56.55} 56.55`}
            strokeLinecap="round"
            transform="rotate(-90 12 12)"
            style={{ transition: "stroke-dasharray 30ms linear" }}
          />
        </svg>
      ) : (
        <CheckCircleIcon className="h-5 w-5" />
      )}
    </button>
  );
}
