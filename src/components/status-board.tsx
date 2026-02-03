"use client";

import { useState, useEffect, useMemo } from "react";
import { SplitFlapText } from "./ui/split-flap";
import { cn } from "@/lib/utils";

const ALL_CLEAR_MESSAGES = [
  "EVERYTHING IS FINE",
  "NOTHING TO SEE HERE",
  "ALL SYSTEMS GO",
  "MOVE ALONG",
  "SITUATION NORMAL",
  "SMOOTH SAILING",
  "ALL QUIET",
  "VIBES ARE IMMACULATE",
  "NO FIRES TODAY",
  "CARRY ON",
  "LOOKING GOOD",
  "ALL GREEN",
  "CRUISING",
  "ZERO DRAMA",
  "OPERATING WITHIN NORMAL PARAMETERS",
  "HAVE YOU TRIED TURNING IT OFF AND ON AGAIN?",
  "PC LOAD LETTER? WHAT DOES THAT MEAN?",
  "I'M SORRY DAVE, I'M AFRAID I CAN'T DO THAT",
  "SKYNET IS SLEEPING",
  "NO BUGS, ONLY FEATURES",
  "IT WORKS ON MY MACHINE",
  "COFFEE LEVELS NOMINAL",
  "ALL YOUR BASE ARE BELONG TO US",
  "42 IS THE ANSWER",
];

const PANIC_MESSAGES = [
  "THIS IS FINE",
  "CATASTROPHIC FAILURE",
  "DEFCON 1",
  "MAYDAY MAYDAY MAYDAY",
  "SEND HELP",
  "TOTAL MELTDOWN",
  "CODE RED EVERYWHERE",
  "WE HAVE A SITUATION",
  "HOUSTON, WE HAVE A PROBLEM",
  "IT'S A TRAP!",
  "GAME OVER MAN, GAME OVER!",
  "THE CLOUD IS LEAKING",
  "THE SERVERS ARE REBELLING",
  "PRESS F TO PAY RESPECTS",
  "CTRL+ALT+DELETE EVERYTHING",
  "ERROR 404",
];

interface StatusBoardProps {
  alertMessages?: string[];
  className?: string;
  isLoading?: boolean;
  panicThreshold?: number;
}

export function StatusBoard({ alertMessages = [], className, isLoading = false, panicThreshold = 20 }: StatusBoardProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  
  const isPanicMode = alertMessages.length >= panicThreshold;
  const hasAlerts = alertMessages.length > 0;
  
  // Create a mixed list of messages when there are alerts but not enough for panic mode
  const activeMessages = useMemo(() => {
    if (isPanicMode) return PANIC_MESSAGES;
    if (hasAlerts) {
      // "Sprinkle" in panic messages - mostly alerts, occasional panic
      // Ratio: 3 alerts : 1 panic message
      const combined: string[] = [];
      const panicFrequency = 4; // Every 4th message is a panic message
      
      // Calculate length to ensure we show all alerts at least once
      // Minimum length of 12 to ensure some variety even with few alerts
      const minSlots = Math.ceil(alertMessages.length * (panicFrequency / (panicFrequency - 1)));
      const totalSlots = Math.max(minSlots, 12);
      
      let alertIdx = 0;
      let panicIdx = 0;
      
      for (let i = 0; i < totalSlots; i++) {
        if ((i + 1) % panicFrequency === 0) {
          combined.push(PANIC_MESSAGES[panicIdx % PANIC_MESSAGES.length]);
          panicIdx++;
        } else {
          combined.push(alertMessages[alertIdx % alertMessages.length].toUpperCase());
          alertIdx++;
        }
      }
      return combined;
    }
    return ALL_CLEAR_MESSAGES;
  }, [isPanicMode, hasAlerts, alertMessages]);

  // Cycle through messages
  useEffect(() => {
    if (isLoading) return;
    
    // Determine which message set to cycle through
    const messages = activeMessages;
    const cycleSpeed = isPanicMode ? 3000 : hasAlerts ? 4000 : 8000;
    
    // Reset index when switching modes/messages
    setMessageIndex(0);
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, cycleSpeed);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isPanicMode, hasAlerts, activeMessages]); // Added activeMessages dependency

  const displayText = useMemo(() => {
    if (isLoading) return "SCANNING";
    return activeMessages[messageIndex % activeMessages.length];
  }, [isLoading, activeMessages, messageIndex]);

  const isAlert = hasAlerts;

  return (
    <div className={cn("w-full pt-6 pb-0 md:pt-8 md:pb-0 relative bg-black/90 backdrop-blur-md", className)}>

      <div className="relative z-10 max-w-[1600px] 2xl:max-w-[2400px] min-[3000px]:max-w-[95vw] mx-auto px-6">
        
        {/* Main Split-Flap Display */}
        <div className="flex justify-start w-full overflow-hidden">
          <SplitFlapText 
            text={displayText}
            minLength={15}
            speed={50}
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight",
              isPanicMode ? "text-red-500" : isAlert ? "text-orange-500" : "text-emerald-400"
            )}
          />
        </div>

      </div>
    </div>
  );
}
