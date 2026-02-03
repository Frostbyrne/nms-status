export interface LibreNMSAlert {
  id: number;
  device_id: number;
  rule_id: number;
  state: number; // 1 = Critical, 2 = Warning, 0 = OK (usually alerts are only active if not 0)
  severity: string; // "critical", "warning", etc.
  hostname: string;
  sysName: string;
  rule: string;
  timestamp: string;
}

export interface LibreNMSDevice {
  device_id: number;
  hostname: string;
  sysName: string;
  ip: string;
  status: boolean | number; // true/1 = Up, false/0 = Down (API may return either format)
  hardware: string;
  os: string;
  location: string;
  type?: string;
  disabled?: number; // 1 = polling disabled, 0 = enabled
  ignore?: number;   // 1 = alerting disabled, 0 = enabled
  last_polled?: string;
  last_pinged?: string;
  last_polled_timet?: number;
  last_pinged_timet?: number;
}

export interface LibreNMSDeviceGroup {
  id: number;
  name: string;
  desc: string;
  devices?: number[]; // Optional because it might not be in the list view
}

export async function fetchAlerts(apiUrl: string, apiKey: string): Promise<LibreNMSAlert[]> {
  // Use the proxy if running client-side, or direct if server-side (but we'll use proxy for simplicity to avoid CORS)
  // Actually, for "simple to run", user might input API key in UI. So we MUST use a proxy or client-side fetch.
  // Direct client-side fetch to LibreNMS often fails CORS. Next.js Proxy is safest.
  
  // However, `librenms.ts` might be used by the proxy itself.
  
  const endpoint = `${apiUrl}/api/v0/alerts`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });
    
    if (!res.ok) {
       throw new Error(`Failed to fetch alerts: ${res.statusText}`);
    }

    const data = await res.json();
    // LibreNMS API structure: { status: "ok", alerts: [...] } or just [...] depend on version/endpoint
    // Usually /alerts returns { alerts: [...] }
    return data.alerts || []; 
  } catch (error) {
    console.error("LibreNMS Fetch Error:", error);
    return [];
  }
}

export async function fetchDevices(apiUrl: string, apiKey: string): Promise<LibreNMSDevice[]> {
  const endpoint = `${apiUrl}/api/v0/devices`;
  try {
    const res = await fetch(endpoint, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });
    
    if (!res.ok) {
       throw new Error(`Failed to fetch devices: ${res.statusText}`);
    }

    const data = await res.json();
    return data.devices || []; 
  } catch (error) {
    console.error("LibreNMS Device Fetch Error:", error);
    return [];
  }
}
