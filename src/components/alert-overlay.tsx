"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Timer, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import type { LibreNMSDevice, LibreNMSAlert } from "@/lib/librenms";

interface DeviceWithAlerts extends LibreNMSDevice {
  activeAlert?: LibreNMSAlert;
}

interface AlertOverlayProps {
  device: DeviceWithAlerts | null;
  onDismiss: () => void;
  autocloseDuration?: number; // seconds, default 60
}

export function AlertOverlay({ device, onDismiss, autocloseDuration = 60 }: AlertOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(autocloseDuration);

  useEffect(() => {
    if (!device) return;
    
    // Timer is handled by mounting/unmounting with key in parent
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [device, autocloseDuration, onDismiss]);

  const displayName = device?.sysName || device?.hostname || "Unknown Device";

  return (
    <AnimatePresence>
      {device && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md"
        >
          {/* Background Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none" 
            style={{
                backgroundImage: 'linear-gradient(rgba(239, 68, 68, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }}
          />
          
          {/* Scanning Line */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/30 animate-[scan_2s_linear_infinite]" />
          </div>

          <div className="relative z-10 w-full max-w-4xl p-12 border-y-2 border-red-500/50 bg-black/80">
             
             <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4 text-red-500">
                    <Activity className="animate-pulse" size={24} />
                    <span className="font-mono text-sm tracking-widest uppercase">Signal Lost // Interruption Detected</span>
                </div>
                <div className="text-red-500 font-mono text-sm border border-red-500/30 px-3 py-1 bg-red-500/10">
                    CODE: CRITICAL
                </div>
             </div>

             <div className="flex flex-col md:flex-row gap-12 items-center">
                 {/* Icon Box */}
                 <div className="shrink-0 w-48 h-48 flex items-center justify-center border border-red-500 bg-red-500/5 relative">
                    <div className="absolute inset-0 border-[0.5px] border-red-500/20 m-2" />
                    <AlertTriangle className="text-red-500 w-24 h-24 animate-[pulse_0.5s_ease-in-out_infinite]" />
                 </div>

                 <div className="flex-1 text-left">
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest uppercase mb-6">
                      System<br/>Failure
                    </h1>
                    <h2 className="text-2xl text-red-500 font-bold font-mono tracking-wide mb-2 uppercase">
                      {displayName}
                    </h2>
                    <p className="text-lg text-zinc-400 font-mono">
                      Target: {device.ip || device.hostname}
                      <br/>
                      Hardware: {device.hardware}
                    </p>
                    
                    <div className="mt-8 pt-8 border-t border-red-500/30 flex items-center gap-8">
                         <div className="flex items-center gap-3 text-zinc-500 font-mono text-sm">
                            <Timer className="w-4 h-4" />
                            <span>AUTO_DISMISS: 00:{timeLeft.toString().padStart(2, '0')}</span>
                         </div>
                         
                         <button 
                            onClick={onDismiss}
                            className="ml-auto px-8 py-3 bg-red-600 hover:bg-red-500 text-black font-bold tracking-widest uppercase transition-colors flex items-center gap-3 text-sm"
                         >
                           <X className="w-4 h-4" /> Acknowledge
                         </button>
                    </div>
                 </div>
             </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
