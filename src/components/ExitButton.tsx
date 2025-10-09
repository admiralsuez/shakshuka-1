"use client";

import { Button } from "@/components/ui/button";
import { useExitConfirmationContext } from "@/components/ExitConfirmationProvider";
import { X } from "lucide-react";

export const ExitButton = () => {
  const { handleExitAttempt } = useExitConfirmationContext();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExitAttempt}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Exit Application"
    >
      <X className="h-4 w-4" />
    </Button>
  );
};
