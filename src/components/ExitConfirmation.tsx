"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ExitConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const maxPayneQuotes = [
  "The past is a puzzle, like a broken mirror. As you piece it together, you cut yourself, your image keeps shifting. And you change with it.",
  "The things I want, the things I need, the things I dream about... they're all different things.",
  "I had a dream of my wife. She was dead. But it was all right.",
  "The way I see it, there's two types of people: those who spend their lives trying to build a future, and those who spend their lives trying to rebuild the past.",
  "Time moves forward, and so do we. But sometimes, the past catches up.",
  "In the end, we're all just trying to make sense of the chaos.",
  "The city never sleeps, but I do. And when I wake up, the nightmare continues.",
  "Every choice we make has consequences. Some we see coming, others hit us like a bullet.",
  "The past is gone, but it's not forgotten. It shapes who we are, even when we try to escape it.",
  "Life is a series of moments, some good, some bad. But it's the bad ones that define us."
];

export const ExitConfirmation = ({ isOpen, onConfirm, onCancel }: ExitConfirmationProps) => {
  const [quote, setQuote] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Select a random quote
      const randomQuote = maxPayneQuotes[Math.floor(Math.random() * maxPayneQuotes.length)];
      setQuote("");
      setIsTyping(true);
      
      // Type out the quote character by character
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < randomQuote.length) {
          setQuote(randomQuote.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 30); // Adjust speed as needed

      return () => clearInterval(typeInterval);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-400 mb-4">
            🚪 Exit Shakshuka
          </DialogTitle>
          <DialogDescription className="text-slate-300 leading-relaxed">
            <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-red-500 mb-4">
              <p className="text-sm text-slate-400 mb-2 font-mono">Max Payne says:</p>
              <p className="text-slate-200 italic">
                {quote}
                {isTyping && <span className="animate-pulse">|</span>}
              </p>
            </div>
            <p className="text-slate-400">
              Are you sure you want to close the application? All unsaved progress will be lost.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            Stay & Continue
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Exit Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
