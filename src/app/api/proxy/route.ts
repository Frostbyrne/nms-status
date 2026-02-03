import { NextRequest, NextResponse } from 'next/server';
import { LibreNMSAlert, LibreNMSDevice } from '@/lib/librenms';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint'); // e.g., '/api/v0/alerts'
  
  const host = process.env.LIBRENMS_HOST;
  const token = process.env.LIBRENMS_API_KEY;

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
  }

  if (!host || !token) {
    console.error("Missing server configuration: LIBRENMS_HOST or LIBRENMS_API_KEY");
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  // Whitelist of allowed endpoints
  const ALLOWED_ENDPOINTS = [
    '/api/v0/alerts',
    '/api/v0/devices',
    '/api/v0/devicegroups',
  ];

  // Whitelist allowed patterns (e.g., /api/v0/devicegroups/123)
  const ALLOWED_PATTERNS = [
    /^\/api\/v0\/devicegroups\/\d+$/
  ];

  // Special endpoint to get base URL for linking
  if (endpoint === '__info__') {
    return NextResponse.json({ baseUrl: host.replace(/\/$/, '') });
  }

  // Ensure host doesn't have trailing slash if endpoint has leading slash, or vice versa
  const normalizedHost = host.replace(/\/$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Validate endpoint against whitelist
  const isAllowed = ALLOWED_ENDPOINTS.includes(normalizedEndpoint) || 
                    ALLOWED_PATTERNS.some(pattern => pattern.test(normalizedEndpoint));

  if (!isAllowed) {
    console.warn(`Blocked proxy request to unauthorized endpoint: ${normalizedEndpoint}`);
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }

  const url = `${normalizedHost}${normalizedEndpoint}`;


  try {
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': token,
        'Accept': 'application/json',
      },
    });

    const data = await res.json();
    
    // Filter response data based on endpoint
    let filteredData = data;

    // Helper functions for filtering
    const filterDevice = (device: LibreNMSDevice): Partial<LibreNMSDevice> => ({
      device_id: device.device_id,
      hostname: device.hostname,
      sysName: device.sysName,
      ip: device.ip,
      status: device.status,
      type: device.type,
      disabled: device.disabled,
      ignore: device.ignore,
      last_polled: device.last_polled
    });

    const filterAlert = (alert: LibreNMSAlert): Partial<LibreNMSAlert> => ({
      id: alert.id,
      device_id: alert.device_id,
      rule_id: alert.rule_id,
      state: alert.state,
      severity: alert.severity,
      hostname: alert.hostname,
      sysName: alert.sysName,
      rule: alert.rule,
      timestamp: alert.timestamp
    });

    if (normalizedEndpoint === '/api/v0/devices') {
      if (data.devices && Array.isArray(data.devices)) {
         filteredData = { ...data, devices: data.devices.map((d: LibreNMSDevice) => filterDevice(d)) };
      } else if (Array.isArray(data)) { // Handle array response if API differs
         filteredData = data.map((d: LibreNMSDevice) => filterDevice(d));
      }
    } else if (normalizedEndpoint === '/api/v0/alerts') {
      if (data.alerts && Array.isArray(data.alerts)) {
        filteredData = { ...data, alerts: data.alerts.map((a: LibreNMSAlert) => filterAlert(a)) };
      } else if (Array.isArray(data)) {
        filteredData = data.map((a: LibreNMSAlert) => filterAlert(a));
      }
    } else if (normalizedEndpoint.startsWith('/api/v0/devicegroups/')) {
        if (data.devices && Array.isArray(data.devices)) {
             filteredData = { ...data, devices: data.devices.map((d: { device_id: number }) => ({ device_id: d.device_id })) };
        }
    }

    return NextResponse.json(filteredData, { status: res.status });
  } catch (error) {
    console.error("Proxy Error:", error);
    return NextResponse.json({ error: 'Failed to fetch from LibreNMS' }, { status: 500 });
  }
}
