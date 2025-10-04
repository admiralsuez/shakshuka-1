"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, RotateCcw } from "lucide-react";

const DEFAULT_WORK_TIME = 25; // minutes
const DEFAULT_BREAK_TIME = 5; // minutes

export function PomodoroTimer() {
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_TIME);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_TIME);
  const [seconds, setSeconds] = useState(DEFAULT_WORK_TIME * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
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
    setSeconds(isBreak ? breakMinutes * 60 : workMinutes * 60);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const switchMode = () => {
    setIsActive(false);
    setIsBreak(!isBreak);
    setSeconds(!isBreak ? breakMinutes * 60 : workMinutes * 60);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleDoubleClick = () => {
    if (isActive) return; // Don't allow editing while timer is running
    const currentMinutes = Math.floor(seconds / 60);
    setEditValue(String(currentMinutes));
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    const newMinutes = parseInt(editValue);
    if (!isNaN(newMinutes) && newMinutes > 0 && newMinutes <= 999) {
      if (isBreak) {
        setBreakMinutes(newMinutes);
      } else {
        setWorkMinutes(newMinutes);
      }
      setSeconds(newMinutes * 60);
    }
    setIsEditing(false);
    setEditValue("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleEditSubmit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue("");
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

      {/* Time Display - Editable on double-click */}
      {isEditing ? (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleEditSubmit}
          className="h-8 w-16 text-sm font-mono text-center p-1"
          autoFocus
          min={1}
          max={999}
        />
      ) : (
        <div 
          className="flex items-center justify-center bg-secondary/80 rounded-lg px-3 h-8 cursor-pointer hover:bg-secondary transition-colors"
          onDoubleClick={handleDoubleClick}
          title="Double-click to edit time"
        >
          <span className="text-sm font-mono font-semibold tabular-nums">
            {String(minutes).padStart(2, "0")}:{String(remainingSeconds).padStart(2, "0")}
          </span>
        </div>
      )}

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