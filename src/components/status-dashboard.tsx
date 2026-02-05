"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AlertCard } from "./alert-card";
import { SplitFlapAudioProvider } from "./ui/split-flap";
import { StatusBoard } from "./status-board";
import type { LibreNMSAlert, LibreNMSDevice, LibreNMSDeviceGroup } from "@/lib/librenms";

interface Config {
  deviceIds: string;
}

interface DeviceWithAlerts extends LibreNMSDevice {
  activeAlert?: LibreNMSAlert;
}

export function StatusDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [config, setConfig] = useState<Config>({ deviceIds: "" });
  const [devices, setDevices] = useState<DeviceWithAlerts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [nmsBaseUrl, setNmsBaseUrl] = useState<string>("");

  // Groups State
  const [deviceGroups, setDeviceGroups] = useState<LibreNMSDeviceGroup[]>([]);




  // Filtering & Sorting State
  const [filterType, setFilterType] = useState<string>(() => {
    return searchParams.get("type") || "all";
  });
  const [filterGroup, setFilterGroup] = useState<string>(() => {
    return searchParams.get("group") || "all";
  });
  
  // Initialize from URL params
  const [sortBy, setSortBy] = useState<"status" | "name" | "id">(() => {
    const param = searchParams.get("sort");
    if (param === "name" || param === "id" || param === "status") return param;
    return "status";
  });
  
  const [showDownOnly, setShowDownOnly] = useState(() => {
    return searchParams.get("down") === "true";
  });

  // Helper to update URL params
  const updateUrlParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // Sync URL when type filter changes
  const handleTypeChange = useCallback((typeId: string) => {
    setFilterType(typeId);
    updateUrlParam("type", typeId === "all" ? null : typeId);
  }, [updateUrlParam]);

  // Sync URL when group filter changes
  const handleGroupChange = useCallback((groupId: string) => {
    setFilterGroup(groupId);
    updateUrlParam("group", groupId === "all" ? null : groupId);
  }, [updateUrlParam]);

  // Sync sort change
  const handleSortChange = useCallback((newSort: "status" | "name" | "id") => {
    setSortBy(newSort);
    updateUrlParam("sort", newSort === "status" ? null : newSort);
  }, [updateUrlParam]);

  // Sync down toggle
  const handleToggleDownOnly = useCallback(() => {
    const newValue = !showDownOnly;
    setShowDownOnly(newValue);
    updateUrlParam("down", newValue ? "true" : null);
  }, [showDownOnly, updateUrlParam]);

  // Load config on mount
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("librenms-config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          setConfig({ deviceIds: parsed.deviceIds || "" });
        }
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
  }, []);

  const fetchData = useCallback(async (currentConfig: Config = config) => {
    setLoading(true);
    setError(null);

    try {
      const [alertsRes, devicesRes, groupsRes, infoRes] = await Promise.all([
        fetch(`/api/proxy?endpoint=/api/v0/alerts`),
        fetch(`/api/proxy?endpoint=/api/v0/devices`),
        fetch(`/api/proxy?endpoint=/api/v0/devicegroups`),
        fetch(`/api/proxy?endpoint=__info__`) // Get base URL info
      ]);

      if (!alertsRes.ok) throw new Error("Failed to fetch alerts");
      if (!devicesRes.ok) throw new Error("Failed to fetch devices");
      
      // Get NMS base URL from info response
      if (infoRes.ok) {
        const infoData = await infoRes.json();
        if (infoData.baseUrl) setNmsBaseUrl(infoData.baseUrl);
      }
      
      const alertsData = await alertsRes.json();
      const devicesData = await devicesRes.json();
      const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] };

      const rawAlerts: LibreNMSAlert[] = alertsData.alerts || [];
      const rawDevices: LibreNMSDevice[] = devicesData.devices || [];
      let rawGroups: LibreNMSDeviceGroup[] = groupsData.groups || [];

      // Fetch members for each group
      if (rawGroups.length > 0) {
        const groupsWithMembers = await Promise.all(rawGroups.map(async (group) => {
          try {
            const res = await fetch(`/api/proxy?endpoint=/api/v0/devicegroups/${group.id}`);
            if (!res.ok) return group;
            const data = await res.json();
            const deviceIds = data.devices?.map((d: { device_id: number }) => d.device_id) || [];
            return { ...group, devices: deviceIds };
          } catch (e) {
            console.warn(`Failed to match members for group ${group.id}`, e);
            return group;
          }
        }));
        rawGroups = groupsWithMembers;
      }

      // Filter Logic
      const targetIds = currentConfig.deviceIds
        .split(",")
        .map(id => parseInt(id.trim()))
        .filter(n => !isNaN(n));

      // 1. Filter Devices (exclude device ID 1, and devices with polling/alerting disabled)
      const filteredDevices = (targetIds.length > 0
        ? rawDevices.filter(d => targetIds.includes(d.device_id))
        : rawDevices
      ).filter(d => 
        d.device_id !== 1 && 
        d.disabled !== 1 && 
        d.ignore !== 1
      );

      // 2. Map Alerts to Devices
      const mappedDevices: DeviceWithAlerts[] = filteredDevices.map(device => {
        const deviceAlerts = rawAlerts.filter(a => a.device_id === device.device_id);
        const critical = deviceAlerts.find(a => a.severity === "critical" || a.state === 1);
        const warning = deviceAlerts.find(a => a.severity === "warning" || a.state === 2);
        
        return {
          ...device,
          activeAlert: critical || warning || undefined
        };
      });

      setDevices(mappedDevices);
      setDeviceGroups(rawGroups);

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to sync with LibreNMS");
      }
    } finally {
      setLoading(false);
    }
  }, [config]);

  // Config loaded via useEffect
  // saveConfig removed - settings modal deprecated

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!isClient) return null;

  const availableTypes = Array.from(new Set(devices.map(d => d.type).filter((t): t is string => !!t)));
  const availableGroups = deviceGroups;

  const isDeviceInGroup = (device: LibreNMSDevice, groupId: string) => {
    if (groupId === "all") return true;
    const group = deviceGroups.find(g => g.id.toString() === groupId);
    return group?.devices?.includes(device.device_id) ?? false;
  };

  const processedDevices = devices
    .filter(d => {
      // Type Filter
      if (filterType !== "all" && d.type !== filterType) return false;
      // Group Filter
      if (filterGroup !== "all" && !isDeviceInGroup(d, filterGroup)) return false;
      // Down Only Filter
      if (showDownOnly) {
         const isDown = d.status === false || d.status === 0;
         return isDown;
      }
      return true;
    })
    .sort((a, b) => {
        if (sortBy === "name") {
            const nameA = a.sysName || a.hostname;
            const nameB = b.sysName || b.hostname;
            return nameA.localeCompare(nameB);
        }
        if (sortBy === "id") {
            return a.device_id - b.device_id;
        }
        // Default: Sort by Status (Priority)
        const aDown = a.status === false || a.status === 0;
        const bDown = b.status === false || b.status === 0;
        if (aDown && !bDown) return -1;
        if (!aDown && bDown) return 1;
        if (a.activeAlert && !b.activeAlert) return -1;
        if (!a.activeAlert && b.activeAlert) return 1;
        return a.device_id - b.device_id;
    });


  // Build alert messages for StatusBoard
  const alertMessages = processedDevices
    .filter(d => d.activeAlert || d.status === false || d.status === 0)
    .map(d => {
      const displayName = d.sysName || d.hostname;
      const deviceType = d.type ? `${d.type.toUpperCase()} - ` : '';
      const status = (d.status === false || d.status === 0) ? 'DOWN' : 'ALERT';
      return `${deviceType}${displayName} ${status}`;
    });

  return (
    <SplitFlapAudioProvider>
      <div className="min-h-screen pb-24 relative">

        {/* Status Board Header */}
        <StatusBoard 
           alertMessages={alertMessages}
           isLoading={devices.length === 0}
        />

        {/* Control Bar - Simplified */}
        <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/5">
            <div className="max-w-[1600px] 2xl:max-w-[2400px] min-[3000px]:max-w-[95vw] mx-auto px-6 h-12 flex items-center justify-between">
                
                <div className="flex items-center gap-4">
                  {/* Sort Control */}
                   <div className="relative group">
                        <select 
                          value={sortBy}
                          onChange={(e) => handleSortChange(e.target.value as "status" | "name" | "id")}
                          className="appearance-none bg-transparent text-zinc-400 text-[10px] font-mono uppercase px-2 py-2 pr-6 cursor-pointer hover:bg-white/5 transition-colors focus:outline-none focus:bg-white/10"
                        >
                          <option value="status">SORT: STATUS</option>
                          <option value="name">SORT: NAME</option>
                          <option value="id">SORT: ID</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-zinc-600">
                           <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                        </div>
                   </div>

                   {/* Down Only Toggle */}
                   <button 
                      onClick={handleToggleDownOnly}
                      className={`text-[10px] font-mono uppercase px-3 py-1.5 border transition-colors ${showDownOnly ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-white/10 text-zinc-500 hover:border-white/20"}`}
                   >
                      {showDownOnly ? "SHOWING DOWN ONLY" : "SHOW DOWN ONLY"}
                   </button>
                </div>

                {(availableTypes.length > 0 || availableGroups.length > 0) && (
                  <div className="flex gap-0 border-l border-white/10">
                    {availableTypes.length > 0 && (
                      <div className="relative group">
                          <select 
                            value={filterType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="appearance-none bg-transparent text-zinc-400 text-[10px] font-mono uppercase px-4 py-2 pr-8 cursor-pointer hover:bg-white/5 transition-colors focus:outline-none focus:bg-white/10"
                            style={{ textAlignLast: 'right' }}
                          >
                            <option value="all">ALL SECTORS</option>
                            {availableTypes.map(type => (
                              <option key={type} value={type}>{type.toUpperCase()}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-600">
                             <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                          </div>
                      </div>
                    )}

                    {availableGroups.length > 0 && (
                       <div className="relative group border-l border-white/10">
                          <select 
                            value={filterGroup}
                            onChange={(e) => handleGroupChange(e.target.value)}
                            className="appearance-none bg-transparent text-zinc-400 text-[10px] font-mono uppercase px-4 py-2 pr-8 cursor-pointer hover:bg-white/5 transition-colors focus:outline-none focus:bg-white/10"
                            style={{ textAlignLast: 'right' }}
                          >
                            <option value="all">ALL UNITS</option>
                            {availableGroups.map(group => (
                              <option key={group.id} value={group.id.toString()}>{group.name.toUpperCase()}</option>
                            ))}
                          </select>
                           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-600">
                             <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                          </div>
                        </div>
                    )}
                  </div>
                )}
            </div>
        </div>

        {/* Main Content */}
        <main className="max-w-[1600px] 2xl:max-w-[2400px] min-[3000px]:max-w-[95vw] mx-auto px-6 pt-8">

          {error && (
             <div className="bg-red-950/20 border border-red-500/20 p-6 mb-8 flex flex-col items-center">
                 <ShieldAlert className="text-red-500 mb-2" size={32} />
                 <p className="text-red-400 font-mono text-sm uppercase tracking-wider">{error}</p>
                 <button onClick={() => fetchData()} className="mt-4 px-4 py-1.5 border border-red-500/30 text-red-400 font-mono text-xs uppercase hover:bg-red-500/10 transition-colors flex items-center gap-2">
                   <RefreshCw size={12} /> Re-Initialize
                 </button>
             </div>
          )}


          {/* Signal Grid */}
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2000px]:grid-cols-6 min-[3000px]:grid-cols-8 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {processedDevices.map((device) => (
                  <AlertCard 
                      key={device.device_id} 
                      alert={device.activeAlert} 
                      device={device}
                      type={device.activeAlert ? "alert" : "device-ok"}
                      nmsBaseUrl={nmsBaseUrl}
                  />
              ))}
            </AnimatePresence>
          </motion.div>
          
          {loading && (
              <div className="fixed bottom-6 right-6 z-40 bg-black/80 p-2 border border-white/10 backdrop-blur">
                  <RefreshCw className="animate-spin text-orange-500" size={16} />
              </div>
          )}

        </main>
      </div>
    </SplitFlapAudioProvider>
  );
}
