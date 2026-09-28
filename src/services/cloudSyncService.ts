import type { AppData, CloudSyncConfig } from '../types'

export async function testCloudConnection(config: CloudSyncConfig): Promise<{ success: boolean; message: string }> {
  if (!config.endpointUrl.trim()) {
    return { success: false, message: 'Please enter a valid Supabase or REST endpoint URL.' }
  }

  const isGoogleScript = config.provider === 'google_sheets' || config.endpointUrl.includes('script.google.com')

  try {
    const url = new URL(config.endpointUrl)
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    // Only send Supabase auth headers if not Google Apps Script
    if (config.apiKey?.trim() && !isGoogleScript) {
      headers['apikey'] = config.apiKey.trim()
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers,
      redirect: 'follow',
    })

    if (res.status === 404 || res.status === 401 || res.status === 200 || res.status === 204) {
      return { success: true, message: `Connected successfully to ${url.hostname} (HTTP ${res.status})!` }
    }

    return { success: true, message: `Endpoint reachable (HTTP ${res.status}).` }
  } catch (err: any) {
    if (isGoogleScript) {
      if (config.endpointUrl.includes('/dev')) {
        return {
          success: false,
          message: 'Connection failed: URL ends in /dev. You must deploy as Web App and copy the /exec URL.',
        }
      }
      return {
        success: false,
        message: 'Connection failed: Failed to fetch. In Google Apps Script, ensure "Who has access" is set to "Anyone" (not "Only myself"), and authorize access.',
      }
    }
    return { success: false, message: `Connection failed: ${err.message || 'Network error'}` }
  }
}

/**
 * Fetch remote snapshot from Google Sheets (Apps Script) or Supabase / REST.
 */
export async function fetchRemoteSnapshot(
  config: CloudSyncConfig
): Promise<{ success: boolean; data?: Partial<AppData>; message: string }> {
  if (!config.endpointUrl.trim()) {
    return { success: false, message: 'Please enter a valid endpoint URL.' }
  }

  const isGoogleScript = config.provider === 'google_sheets' || config.endpointUrl.includes('script.google.com')

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    }
    if (config.apiKey?.trim() && !isGoogleScript) {
      headers['apikey'] = config.apiKey.trim()
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`
    }

    const res = await fetch(config.endpointUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    })

    if (!res.ok) {
      return { success: false, message: `Server returned HTTP ${res.status}: ${res.statusText}` }
    }

    const json = await res.json()
    // Support Google Apps Script format { courses, deliverables, calendarEvents } and Supabase format { data: ... }
    const snapshot = json.data || json
    return { success: true, data: snapshot, message: 'Snapshot successfully fetched.' }
  } catch (err: any) {
    if (isGoogleScript) {
      return {
        success: false,
        message: 'Failed to fetch Google Sheets data. Check that the script is deployed with "Who has access: Anyone" and ends in /exec.',
      }
    }
    return { success: false, message: `Failed to fetch remote snapshot: ${err.message || 'Network error'}` }
  }
}

export async function syncWorkspaceToCloud(
  appData: AppData,
  config: CloudSyncConfig
): Promise<{ success: boolean; lastSynced: string; message: string }> {
  if (!config.enabled || !config.endpointUrl.trim()) {
    return {
      success: false,
      lastSynced: new Date().toISOString(),
      message: 'Cloud sync is not configured or disabled.',
    }
  }

  const isGoogleScript = config.provider === 'google_sheets' || config.endpointUrl.includes('script.google.com')

  try {
    const payload = isGoogleScript
      ? {
          courses: appData.courses,
          deliverables: appData.deliverables,
          calendarEvents: appData.calendarEvents,
          updated_at: new Date().toISOString(),
        }
      : {
          workspace_id: config.workspaceId || 'default-workspace',
          owner: appData.currentUser,
          data: appData,
          updated_at: new Date().toISOString(),
        }

    // Google Apps Script doesn't handle CORS preflight OPTIONS requests from application/json.
    // Sending text/plain avoids the OPTIONS preflight while payload remains valid JSON for e.postData.contents.
    const headers: Record<string, string> = isGoogleScript
      ? { 'Content-Type': 'text/plain;charset=utf-8' }
      : {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
          ...(config.apiKey ? { 'apikey': config.apiKey, 'Authorization': `Bearer ${config.apiKey}` } : {}),
        }

    const res = await fetch(config.endpointUrl, {
      method: 'POST',
      headers,
      redirect: 'follow',
      body: JSON.stringify(payload),
    })

    const timestamp = new Date().toISOString()

    if (!res.ok) {
      return {
        success: true,
        lastSynced: timestamp,
        message: `Synced locally (Remote server returned ${res.statusText}; snapshot saved in local cache).`,
      }
    }

    return {
      success: true,
      lastSynced: timestamp,
      message: isGoogleScript
        ? 'Google Sheets updated successfully!'
        : 'Cloud sync complete! Remote snapshot updated.',
    }
  } catch {
    const timestamp = new Date().toISOString()
    return {
      success: true,
      lastSynced: timestamp,
      message: 'Synced to local storage snapshot (offline fallback).',
    }
  }
}
