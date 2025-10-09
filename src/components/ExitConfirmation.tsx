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
          <DialogTitle>Exit Shakshuka?</DialogTitle>
          <DialogDescription>
            Are you sure you want to close the application?
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Exit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};