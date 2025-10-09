"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useExitConfirmationContext } from "@/components/ExitConfirmationProvider";

interface CustomTitleBarProps {
  title?: string;
}

export const CustomTitleBar = ({ title = "Shakshuka" }: CustomTitleBarProps) => {
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { handleExitAttempt } = useExitConfirmationContext();

  useEffect(() => {
    // Check if running in Tauri with more robust detection
    console.log("🔍 Checking for Tauri...");
    console.log("🔍 Window object:", typeof window !== "undefined");
    console.log("🔍 Tauri object:", (window as any).__TAURI__);
    console.log("🔍 User agent:", navigator.userAgent);
    
    // More robust Tauri detection - check multiple indicators
    const hasTauriObject = typeof window !== "undefined" && (window as any).__TAURI__;
    const hasWebviewWindow = hasTauriObject && (window as any).__TAURI__.webviewWindow;
    const isTauriUserAgent = navigator.userAgent.includes('Tauri');
    
    console.log("🔍 Tauri indicators:", {
      hasTauriObject,
      hasWebviewWindow,
      isTauriUserAgent
    });
    
    const isTauri = hasTauriObject && hasWebviewWindow;
    
    if (isTauri) {
      console.log("✅ Tauri detected, enabling custom title bar");
      setIsTauriApp(true);
      // Check initial maximized state
      checkMaximizedState();
      
      // Listen for window resize events to update maximized state
      const setupResizeListener = async () => {
        try {
          const { getCurrentWebviewWindow } = (window as any).__TAURI__.webviewWindow;
          const webview = getCurrentWebviewWindow();
          const unlisten = await webview.onResized(() => {
            console.log("🔄 Window resized, checking maximized state...");
            checkMaximizedState();
          });
          console.log("✅ Resize listener set up");
          return unlisten;
        } catch (error) {
          console.error("❌ Error setting up resize listener:", error);
        }
      };
      
      setupResizeListener();
    } else {
      console.log("❌ Tauri not detected, showing Web Mode");
      setIsTauriApp(false);
    }
  }, []);

  const checkMaximizedState = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        const { getCurrentWebviewWindow } = (window as any).__TAURI__.webviewWindow;
        const webview = getCurrentWebviewWindow();
        const maximized = await webview.isMaximized();
        setIsMaximized(maximized);
      }
    } catch (error) {
      console.error("Error checking maximized state:", error);
    }
  };

  const handleMinimize = async () => {
    console.log("🔽 Minimize button clicked");
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        console.log("🔍 Getting webview window for minimize...");
        const { getCurrentWebviewWindow } = (window as any).__TAURI__.webviewWindow;
        const webview = getCurrentWebviewWindow();
        console.log("🔍 Webview object:", webview);
        await webview.minimize();
        console.log("✅ Window minimized successfully");
      } else {
        console.log("❌ Tauri not available for minimize");
      }
    } catch (error) {
      console.error("❌ Error minimizing window:", error);
    }
  };

  const handleMaximize = async () => {
    console.log("🔲 Maximize button clicked, current state:", isMaximized);
    try {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        console.log("🔍 Getting webview window for maximize...");
        const { getCurrentWebviewWindow } = (window as any).__TAURI__.webviewWindow;
        const webview = getCurrentWebviewWindow();
        console.log("🔍 Webview object:", webview);
        
        if (isMaximized) {
          console.log("🔍 Restoring window...");
          await webview.unmaximize();
          setIsMaximized(false);
          console.log("✅ Window restored successfully");
        } else {
          console.log("🔍 Maximizing window...");
          await webview.maximize();
          setIsMaximized(true);
          console.log("✅ Window maximized successfully");
        }
      } else {
        console.log("❌ Tauri not available for maximize");
      }
    } catch (error) {
      console.error("❌ Error toggling maximize:", error);
    }
  };

  const handleClose = () => {
    console.log("🚪 Close button clicked! Using exit confirmation...");
    // Use the exit confirmation system instead of directly closing
    handleExitAttempt();
  };

  // Always show title bar, but disable controls when not in Tauri
  console.log("🎨 Rendering custom title bar, isTauriApp:", isTauriApp);

  return (
    <div className="flex items-center justify-between bg-slate-800 text-white h-8 px-4 select-none custom-title-bar fixed top-0 left-0 right-0 z-[9999]">
      {/* Left side - App icon and title */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-sm flex items-center justify-center">
          <span className="text-xs font-bold text-white">S</span>
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Center - Drag area */}
      <div className="flex-1 h-full" />

      {/* Right side - Window controls */}
      <div className="flex items-center gap-1">
        {isTauriApp ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="h-6 w-8 p-0 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect width="10" height="1" x="1" y="5.5" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaximize}
              className="h-6 w-8 p-0 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                {isMaximized ? (
                  <path d="M3 3h6v6H3V3zm1 1v4h4V4H4z" />
                ) : (
                  <path d="M2 2h8v8H2V2zm1 1v6h6V3H3z" />
                )}
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-8 p-0 hover:bg-red-500 text-slate-300 hover:text-white transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M9.5 2.5L6 6L2.5 2.5L2.5 2.5L6 6L9.5 9.5L9.5 9.5L6 6L2.5 9.5L2.5 9.5L6 6L9.5 2.5z" />
              </svg>
            </Button>
          </>
        ) : (
          <div className="text-xs text-slate-400 px-2">Web Mode</div>
        )}
      </div>
    </div>
  );
};