"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Save } from "lucide-react";

interface Config {
  deviceIds: string; // Comma separated
}

interface SettingsModalProps {
  config: Config;
  onSave: (config: Config) => void;
}

export function SettingsModal({ config: initialConfig, onSave }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState(initialConfig);

  useEffect(() => {
    setLocalConfig(initialConfig);
  }, [initialConfig]);

  const handleSave = () => {
    onSave(localConfig);
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 rounded-full glass-panel hover:bg-slate-800 transition-colors text-slate-400 hover:text-white z-50"
      >
        <Settings size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-950 border border-slate-800 p-6 rounded-2xl shadow-2xl relative neon-border"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Settings className="text-primary" /> Configuration
              </h2>

              <div className="space-y-4">

                <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Device IDs (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="1, 5, 20 (Leave empty for all)"
                      value={localConfig.deviceIds}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, deviceIds: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Only alerts for these devices will be shown.</p>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="mt-6 w-full py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Save size={18} /> Save Configuration
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
