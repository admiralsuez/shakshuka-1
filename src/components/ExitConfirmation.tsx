"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExitConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ExitConfirmation = ({ isOpen, onConfirm, onCancel }: ExitConfirmationProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Quitting already?</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Your progress will be saved automatically.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-3 sm:gap-3 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto sm:flex-1"
          >
            But I couldn't stop. I had to push on
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            className="w-full sm:w-auto sm:flex-1"
          >
            I was too tired to go on
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};