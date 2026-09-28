import React, { useState } from 'react'
import type { AppData, CloudSyncConfig } from '../types'
import { testCloudConnection, syncWorkspaceToCloud, fetchRemoteSnapshot } from '../services/cloudSyncService'
import { X, Cloud, Check, RefreshCw, Key, Globe, Shield, Sheet, ArrowDownRight } from 'lucide-react'

interface CloudSyncModalProps {
  appData: AppData
  config: CloudSyncConfig
  isOpen: boolean
  onClose: () => void
  onSaveConfig: (config: CloudSyncConfig) => void
  onOpenDiffReview: (remoteData: Partial<AppData>, providerName: string) => void
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  appData,
  config,
  isOpen,
  onClose,
  onSaveConfig,
  onOpenDiffReview,
}) => {
  const [provider, setProvider] = useState<'supabase' | 'custom_rest' | 'google_sheets'>(
    config.provider || 'google_sheets'
  )
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '')
  const [apiKey, setApiKey] = useState(config.apiKey || '')
  const [workspaceId, setWorkspaceId] = useState(config.workspaceId || 'ds-fall2026-hub')
  const [enabled, setEnabled] = useState(config.enabled ?? false)

  const [testingStatus, setTestingStatus] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  if (!isOpen) return null

  const handleTest = async () => {
    setIsTesting(true)
    setTestingStatus(null)
    try {
      const res = await testCloudConnection({
        enabled,
        provider,
        endpointUrl,
        apiKey,
        workspaceId,
      })
      setTestingStatus(res.message)
    } finally {
      setIsTesting(false)
    }
  }

  const handlePullAndReview = async () => {
    setIsPulling(true)
    setSyncStatus(null)
    const currentConfig: CloudSyncConfig = {
      enabled,
      provider,
      endpointUrl,
      apiKey,
      workspaceId,
    }

    try {
      const res = await fetchRemoteSnapshot(currentConfig)
      if (!res.success || !res.data) {
        setSyncStatus(res.message)
        return
      }
      onOpenDiffReview(res.data, provider === 'google_sheets' ? 'Google Sheets' : 'Cloud Remote')
      onClose()
    } finally {
      setIsPulling(false)
    }
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncStatus(null)
    const currentConfig: CloudSyncConfig = {
      enabled,
      provider,
      endpointUrl,
      apiKey,
      workspaceId,
    }
    try {
      const res = await syncWorkspaceToCloud(appData, currentConfig)
      setSyncStatus(res.message)
      onSaveConfig({ ...currentConfig, lastSynced: res.lastSynced })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = () => {
    onSaveConfig({
      enabled,
      provider,
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim(),
      workspaceId: workspaceId.trim(),
      lastSynced: config.lastSynced,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-modal-title"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              {provider === 'google_sheets' ? <Sheet className="w-5 h-5 text-[#5B9975]" /> : <Cloud className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="cloud-modal-title" className="text-base font-semibold text-[#E0E6E4]">
                  Cloud Sync &amp; Database Settings
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B8266]/20 text-[#5B8266] border border-[#5B8266]/30 font-mono">
                  {provider === 'google_sheets' ? 'Google Sheets Live' : 'Supabase / REST'}
                </span>
              </div>
              <p className="text-xs text-[#8C9E96]">
                {provider === 'google_sheets'
                  ? 'Two-way synchronization with Google Sheets via free Google Apps Script Web App'
                  : 'Persist workspace to remote cloud PostgreSQL for live multi-device access'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C9E96] hover:text-[#E0E6E4] p-1.5 rounded-lg hover:bg-[#1B2220] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 text-xs">
          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#1B2220] border border-[#2D3834]">
            <div>
              <span className="font-medium text-[#E0E6E4] block">Enable Remote Cloud Sync</span>
              <span className="text-[11px] text-[#8C9E96]">
                Sync courses, buffer deliverables, and calendar events across team members
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-[#131716] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[#E0E6E4] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8C9E96] peer-checked:after:bg-[#E0E6E4] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5B8266]" />
            </label>
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
              >
                <option value="google_sheets">Google Sheets (Apps Script Web App)</option>
                <option value="supabase">Supabase PostgreSQL</option>
                <option value="custom_rest">Custom REST API</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">
                Workspace Identifier {provider === 'google_sheets' && <span className="text-[#8C9E96]/60 font-normal">(Optional)</span>}
              </label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                disabled={provider === 'google_sheets'}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none disabled:opacity-50"
                placeholder={provider === 'google_sheets' ? 'Sheets uses single spreadsheet' : 'ds-fall2026-hub'}
              />
            </div>
          </div>

          {/* Endpoint URL */}
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#5B8266]" />
              <span>
                {provider === 'google_sheets' ? 'Google Apps Script Web App URL (/exec)' : 'Database / Endpoint URL'}
              </span>
            </label>
            <input
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder={
                provider === 'google_sheets'
                  ? 'https://script.google.com/macros/s/AKfycb.../exec'
                  : 'https://xyzcompany.supabase.co/rest/v1/workspaces'
              }
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
              <Key className="w-3.5 h-3.5 text-[#648381]" />
              <span>
                {provider === 'google_sheets' ? 'Optional Secret / Token (if checked in script)' : 'Anon API Key / Bearer Token'}
              </span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'google_sheets' ? 'Optional bearer or pre-shared key' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
            />
          </div>

          {/* Testing Status */}
          {testingStatus && (
            <div className="p-3 rounded-lg bg-[#131716] border border-[#2D3834] text-[11px] text-[#E0E6E4] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#5B8266] shrink-0" />
              <span>{testingStatus}</span>
            </div>
          )}

          {/* Sync Status */}
          {syncStatus && (
            <div className="p-3 rounded-lg bg-[#18261F] border border-[#5B9975]/30 text-[11px] text-[#5B9975] flex items-center gap-2">
              <Check className="w-4 h-4 text-[#5B9975] shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          {config.lastSynced && (
            <div className="text-[11px] font-mono text-[#8C9E96]">
              Last cloud snapshot: {new Date(config.lastSynced).toLocaleString()}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-[#2D3834]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !endpointUrl}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors disabled:opacity-50"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={handlePullAndReview}
              disabled={isPulling || !endpointUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5B8266] bg-[#5B8266]/15 text-xs text-[#A3C9A8] hover:bg-[#5B8266]/30 transition-colors disabled:opacity-50 font-medium"
              title="Pull remote data and review visual diff before merging"
            >
              <ArrowDownRight className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{isPulling ? 'Pulling...' : 'Pull & Review Diff'}</span>
            </button>
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || !endpointUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors disabled:opacity-50"
              title="Push local data directly to remote"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Pushing...' : 'Push Local → Remote'}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-md transition-colors"
            >
              Save Cloud Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
