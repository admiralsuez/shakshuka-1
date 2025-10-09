"use client";

import { useState, useEffect } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

interface AppWrapperProps {
  children: React.ReactNode;
}

export const AppWrapper = ({ children }: AppWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  // Add data attribute to help with loading detection
  useEffect(() => {
    const mainContent = document.querySelector('main') || document.body;
    if (mainContent) {
      mainContent.setAttribute('data-main-content', 'true');
    }
  }, []);

  return (
    <>
      {isLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
      {!isLoading && children}
    </>
  );
};
