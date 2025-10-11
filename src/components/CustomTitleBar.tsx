"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useExitConfirmationContext } from "@/components/ExitConfirmationProvider";

// Hook to detect if we're in Tauri
export const useIsTauri = () => {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const checkTauri = async () => {
      if (typeof window === "undefined") {
        setIsTauri(false);
        return;
      }

      // Check for Tauri API
      const hasTauriAPI = !!(window as any).__TAURI__;

      // Also check for TAURI_PLATFORM env variable (available in production)
      const hasTauriPlatform = !!(window as any).__TAURI_INTERNALS__;

      const isTauriEnv = hasTauriAPI || hasTauriPlatform;

      console.log("Tauri detection:", { hasTauriAPI, hasTauriPlatform, isTauriEnv });
      setIsTauri(isTauriEnv);
    };

    checkTauri();
  }, []);

  return isTauri;
};

export const CustomTitleBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const { handleExitAttempt } = useExitConfirmationContext();

  // Check if running in Tauri
  const isTauri = useIsTauri();

  useEffect(() => {
    if (!isTauri) return;

    // Check initial maximized state
    const checkMaximized = async () => {
      try {
        const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
        const maximized = await webview.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error("Error checking maximized state:", error);
      }
    };

    checkMaximized();

    // Listen for window resize events
    const setupResizeListener = async () => {
      try {
        const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
        const unlisten = await webview.onResized(() => {
          checkMaximized();
        });
        return unlisten;
      } catch (error) {
        console.error("Error setting up resize listener:", error);
      }
    };

    setupResizeListener();
  }, [isTauri]);

  const handleMinimize = async () => {
    if (!isTauri) return;
    try {
      const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
      await webview.minimize();
    } catch (error) {
      console.error("Error minimizing:", error);
    }
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    try {
      const webview = (window as any).__TAURI__.webviewWindow.getCurrentWebviewWindow();
      if (isMaximized) {
        await webview.unmaximize();
      } else {
        await webview.maximize();
      }
    } catch (error) {
      console.error("Error maximizing:", error);
    }
  };

  const handleClose = () => {
    if (!isTauri) return;
    handleExitAttempt();
  };

  // Only render in Tauri
  if (!isTauri) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between bg-[#181818] text-[#cccccc] h-[35px] px-2 fixed top-0 left-0 right-0 z-50 border-b border-[#2d2d2d]"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3 h-full" data-tauri-drag-region>
        <div className="w-5 h-5 flex items-center justify-center" data-tauri-drag-region>
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3794ff"/>
            <path d="M2 17L12 22L22 17" stroke="#3794ff" strokeWidth="2"/>
            <path d="M2 12L12 17L22 12" stroke="#3794ff" strokeWidth="2"/>
          </svg>
        </div>
        <span className="text-[13px] font-normal text-[#cccccc]" data-tauri-drag-region>Shakshuka</span>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full w-[46px] flex items-center justify-center hover:bg-[#2d2d2d] transition-colors"
          data-tauri-drag-region="false"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect width="10" height="1" y="5" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="h-full w-[46px] flex items-center justify-center hover:bg-[#2d2d2d] transition-colors"
          data-tauri-drag-region="false"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            {isMaximized ? (
              <>
                <rect x="0" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
                <rect x="2" y="0" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="#181818" />
              </>
            ) : (
              <rect x="1" y="1" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
            )}
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="h-full w-[46px] flex items-center justify-center hover:bg-[#e81123] transition-colors group"
          data-tauri-drag-region="false"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="group-hover:text-white">
            <path d="M0.5 0.5L9.5 9.5M9.5 0.5L0.5 9.5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Component that conditionally positions header based on Tauri detection
export const ConditionalHeader = ({ children }: { children: React.ReactNode }) => {
  const isTauri = useIsTauri();

  return (
    <header className={`w-full border-b bg-background sticky ${isTauri ? 'top-[35px]' : 'top-0'} z-40`}>
      {children}
    </header>
  );
};