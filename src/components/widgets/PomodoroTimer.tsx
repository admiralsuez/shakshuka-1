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
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={!isBreak ? "default" : "outline"}
              onClick={switchMode}
              className="text-xs"
            >
              Work
            </Button>
            <Button
              size="sm"
              variant={isBreak ? "default" : "outline"}
              onClick={switchMode}
              className="text-xs"
            >
              Break
            </Button>
          </div>

          <div className="text-4xl font-bold tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={toggle}>
              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {isActive ? "Timer running" : "Timer paused"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}