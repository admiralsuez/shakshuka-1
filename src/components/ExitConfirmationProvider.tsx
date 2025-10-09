"use client";

import { createContext, useContext, ReactNode } from "react";
import { useExitConfirmation } from "@/hooks/useExitConfirmation";
import { ExitConfirmation } from "@/components/ExitConfirmation";

interface ExitConfirmationContextType {
  handleExitAttempt: () => void;
}

const ExitConfirmationContext = createContext<ExitConfirmationContextType | undefined>(undefined);

export const useExitConfirmationContext = () => {
  const context = useContext(ExitConfirmationContext);
  if (!context) {
    throw new Error("useExitConfirmationContext must be used within ExitConfirmationProvider");
  }
  return context;
};

interface ExitConfirmationProviderProps {
  children: ReactNode;
}

export const ExitConfirmationProvider = ({ children }: ExitConfirmationProviderProps) => {
  const { showExitDialog, handleExitAttempt, handleConfirmExit, handleCancelExit } = useExitConfirmation();

  return (
    <ExitConfirmationContext.Provider value={{ handleExitAttempt }}>
      {children}
      <ExitConfirmation
        isOpen={showExitDialog}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </ExitConfirmationContext.Provider>
  );
};
