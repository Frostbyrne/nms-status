"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibreNMSAlert, LibreNMSDevice } from "@/lib/librenms";

interface AlertCardProps {
  alert?: LibreNMSAlert;
  device?: LibreNMSDevice;
  type: "alert" | "device-ok";
  nmsBaseUrl?: string;
}

export function AlertCard({ alert, device, nmsBaseUrl }: AlertCardProps) {
  const displayName = alert?.sysName || device?.sysName || alert?.hostname || device?.hostname || "Unknown Device";
  // Determine state - status can be 0/1 (number) or false/true (boolean) depending on API
  const displayIp = device?.ip || alert?.hostname || device?.hostname || ""; 
  const isDown = device?.status === false || device?.status === 0;
  const isCritical = isDown || (alert?.severity === "critical" || alert?.state === 1);
  const isWarning = !isCritical && (alert?.severity === "warning" || alert?.state === 2);
  
  const deviceId = device?.device_id || alert?.device_id;
  const nmsUrl = nmsBaseUrl && deviceId ? `${nmsBaseUrl}/device/device=${deviceId}/` : undefined;

  const handleClick = () => {
    if (nmsUrl) {
      window.open(nmsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClick}
      className={cn(
        "relative p-5 border transition-colors duration-300 group font-mono flex flex-col justify-between h-full min-h-[140px]",
        nmsUrl && "cursor-pointer",
        isCritical 
          ? "bg-red-950/10 border-red-500/50 hover:bg-red-950/20" 
          : isWarning
            ? "bg-orange-950/10 border-orange-500/50 hover:bg-orange-950/20"
            : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
      )}
    >
      {/* Top Bar Status Line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px]",
        isCritical ? "bg-red-500" : isWarning ? "bg-orange-500" : "bg-transparent group-hover:bg-white/20"
      )} />

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">{displayName}</h3>
          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">
            ID: {device?.device_id || "N/A"} {'//'} {displayIp}
          </p>
        </div>
        <div className={cn(
            "p-1.5 rounded-sm",
            isCritical ? "text-red-500 bg-red-500/10" : isWarning ? "text-orange-500 bg-orange-500/10" : "text-emerald-500/40 bg-emerald-500/5"
        )}>
            {isCritical || isWarning ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
        </div>
      </div>

      {/* Status Details */}
      <div className="mt-auto pt-4 border-t border-white/5">
         <div className="flex justify-between items-end">
            <div>
               <p className="text-[10px] text-zinc-600 uppercase mb-1">Status Signal</p>
               <p className={cn(
                   "text-xs font-bold uppercase tracking-wider",
                   isCritical ? "text-red-500 animate-pulse" : isWarning ? "text-orange-500" : "text-emerald-500"
               )}>
                   {isDown ? "CONNECTION LOST" : isCritical ? "CRITICAL ALERT" : isWarning ? "WARNING" : "OPERATIONAL"}
               </p>
            </div>
            
            {/* Timestamp/Tech Data */}
            <div className="text-right">
                <p className="text-[10px] text-zinc-600 uppercase mb-1">Last Contact</p>
                <p className="text-[10px] text-zinc-400 font-mono">
                   {(() => {
                      if (isDown && device?.last_polled) {
                        return new Date(device.last_polled).toLocaleString([], {
                           month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
                        });
                      }
                      if (alert?.timestamp) {
                        return new Date(alert.timestamp).toLocaleTimeString([], {hour12: false});
                      }
                      // If it's a critical alert but not a full device down, we might want to show alert time or "LIVE"
                      // "LIVE" implies we are actively monitoring it. 
                      // If device is down, we are NOT live.
                      return isDown ? "OFFLINE" : "LIVE";
                   })()}
                </p>
            </div>
         </div>
         
         {/* Alert Rule Description if Active */}
         {(isCritical || isWarning) && (
             <div className="mt-3 text-[10px] text-zinc-400 bg-black/50 p-2 border-l-2 border-current" style={{borderColor: isCritical ? '#ef4444' : '#f97316'}}>
                 {alert?.rule || "System Unreachable"}
             </div>
         )}
      </div>

    </motion.div>
  );
}
