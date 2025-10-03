"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const BREAK_TIME = 5 * 60; // 5 minutes in seconds

export function PomodoroTimer() {
  const [seconds, setSeconds] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0) {
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, seconds]);

  const toggle = () => {
    setIsActive(!isActive);
  };

  const reset = () => {
    setIsActive(false);
    setSeconds(isBreak ? BREAK_TIME : WORK_TIME);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const switchMode = () => {
    setIsActive(false);
    setIsBreak(!isBreak);
    setSeconds(!isBreak ? BREAK_TIME : WORK_TIME);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // Stop timer when a strike is made (listen to custom event)
  useEffect(() => {
    const handleStrike = () => {
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };

    window.addEventListener("task-struck", handleStrike);
    return () => window.removeEventListener("task-struck", handleStrike);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return (
    <div className="flex items-center gap-2">
      {/* Work/Break Indicator with Flame */}
      <Button
        size="sm"
        variant={!isBreak ? "default" : "secondary"}
        onClick={switchMode}
        className="h-8 px-3 text-xs gap-1.5"
      >
        🔥
        <span className="hidden sm:inline">{!isBreak ? "Work" : "Break"}</span>
      </Button>

      {/* Time Display */}
      <div className="flex items-center justify-center bg-secondary/80 rounded-lg px-3 h-8">
        <span className="text-sm font-mono font-semibold tabular-nums">
          {isActive ? "+" : ""}
          {String(minutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={toggle} className="h-8 w-8 p-0">
          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="h-8 w-8 p-0">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}