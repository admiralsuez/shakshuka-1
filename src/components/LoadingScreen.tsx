"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  useEffect(() => {
    // Check if the app is loaded by monitoring various indicators
    const checkAppLoaded = () => {
      // Check if Next.js is ready
      const isNextReady = document.readyState === 'complete';
      
      // Check if React has hydrated (look for React-specific attributes)
      const isReactHydrated = document.querySelector('[data-reactroot]') !== null ||
                             document.querySelector('[data-react-helmet]') !== null ||
                             document.querySelector('script[src*="next"]') !== null;
      
      // Check if our main content is rendered
      const hasMainContent = document.querySelector('main') !== null || 
                           document.querySelector('[data-main-content]') !== null ||
                           document.querySelector('header') !== null;
      
      // Check if Tauri is ready (if running in Tauri)
      const isTauriReady = typeof window !== 'undefined' && 
                          (window as any).__TAURI__ !== undefined;
      
      // Check if key components are loaded
      const hasKeyComponents = document.querySelector('[data-testid]') !== null ||
                              document.querySelector('.antialiased') !== null;
      
      return isNextReady && (isReactHydrated || hasMainContent) && 
             (isTauriReady || hasKeyComponents);
    };

    // Monitor app loading state
    const checkInterval = setInterval(() => {
      if (checkAppLoaded() && !isAppLoaded) {
        setIsAppLoaded(true);
        console.log("🚀 App loaded! Fast-forwarding animation...");
      }
    }, 100);

    // Initial check
    if (checkAppLoaded()) {
      setIsAppLoaded(true);
    }

    return () => clearInterval(checkInterval);
  }, [isAppLoaded]);

  useEffect(() => {
    const baseDuration = 3000; // 3 seconds base duration
    const fastForwardDuration = 500; // 0.5 seconds when app is loaded
    const minimumDuration = 1000; // Minimum 1 second to show animation
    
    const duration = isAppLoaded ? Math.max(fastForwardDuration, minimumDuration) : baseDuration;
    const steps = 100;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(currentStep, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        // Wait a moment before completing
        setTimeout(() => {
          setIsVisible(false);
          setTimeout(onComplete, 500); // Wait for exit animation
        }, 300);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [onComplete, isAppLoaded]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
        >
          {/* Background stars */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          {/* Floating particles during wake-up */}
          {progress > 40 && (
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-70"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 1, 0],
                    scale: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 3,
                  }}
                />
              ))}
            </div>
          )}

          {/* Main content */}
          <div className="relative z-10 text-center">
            {/* Sleeping/Waking Character */}
            <motion.div
              className="mb-8 text-6xl"
              animate={{
                rotateY: progress > 50 ? 0 : 15,
                scale: progress > 30 ? 1.1 : 1,
              }}
              transition={{ duration: 0.5 }}
            >
              {progress < 20 ? (
                // Deep sleep
                <motion.div
                  animate={{
                    y: [0, -5, 0],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  😴
                </motion.div>
              ) : progress < 40 ? (
                // Light sleep
                <motion.div
                  animate={{
                    y: [0, -3, 0],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                >
                  🥱
                </motion.div>
              ) : progress < 60 ? (
                // Waking up
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  😑
                </motion.div>
              ) : progress < 80 ? (
                // Almost awake
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                  }}
                >
                  😊
                </motion.div>
              ) : (
                // Fully awake
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                  }}
                >
                  😄
                </motion.div>
              )}
            </motion.div>

            {/* App Title */}
            <motion.h1
              className="text-4xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Shakshuka
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg text-purple-200 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {isAppLoaded ? "Almost ready..." :
               progress < 30 ? "Dreaming of productivity..." :
               progress < 60 ? "Stretching and yawning..." :
               progress < 80 ? "Opening eyes slowly..." :
               "Ready to conquer the day!"}
            </motion.p>

            {/* Progress Bar */}
            <div className="w-80 mx-auto">
              <div className="bg-white/20 rounded-full h-3 overflow-hidden relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 rounded-full relative"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Shimmer effect on progress bar */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
                
                {/* Progress bar glow */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.3), transparent)`,
                  }}
                  animate={{
                    opacity: progress > 50 ? [0.5, 1, 0.5] : 0,
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
              </div>
              
              {/* Progress Text */}
              <motion.div
                className="mt-4 text-2xl font-bold text-white"
                key={progress}
                initial={{ scale: 1.2, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {progress}%
              </motion.div>
            </div>

            {/* Loading dots */}
            <motion.div
              className="flex justify-center mt-6 space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: isAppLoaded ? 0.3 : 1,
                    repeat: Infinity,
                    delay: i * (isAppLoaded ? 0.1 : 0.2),
                  }}
                />
              ))}
            </motion.div>

            {/* Fast-forward indicator */}
            {isAppLoaded && (
              <motion.div
                className="mt-4 text-sm text-purple-300"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                ⚡ Fast-forwarding...
              </motion.div>
            )}
          </div>

          {/* Wake-up animation overlay */}
          {progress > 70 && (
            <motion.div
              className="absolute inset-0 wake-up-shimmer"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}

          {/* Additional wake-up effects */}
          {progress > 60 && (
            <>
              <motion.div
                className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
              <motion.div
                className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-lg"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.5,
                }}
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
