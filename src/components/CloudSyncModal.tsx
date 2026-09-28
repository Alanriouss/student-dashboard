import React, { useState } from 'react'
import type { AppData, CloudSyncConfig } from '../types'
import { testCloudConnection, syncWorkspaceToCloud, fetchRemoteSnapshot } from '../services/cloudSyncService'
import {
  X,
  Cloud,
  Check,
  RefreshCw,
  Key,
  Globe,
  Shield,
  Sheet,
  ArrowDownRight,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface CloudSyncModalProps {
  appData: AppData
  config: CloudSyncConfig
  isOpen: boolean
  onClose: () => void
  onSaveConfig: (config: CloudSyncConfig) => void
  onOpenDiffReview: (remoteData: Partial<AppData>, providerName: string) => void
}

const APPS_SCRIPT_TEMPLATE = `const DEFAULT_HEADERS = {
  Courses: ["id", "code", "title", "credits", "semester", "weightInClass", "weightMidterm", "weightFinal", "scoreInClass", "scoreMidterm", "scoreFinal", "targetGrade"],
  Deliverables: ["id", "projectId", "taskName", "milestonePhase", "ownerName", "internalBufferDeadline", "officialDueDate", "peerReviewer", "status", "artifactUrl"],
  CalendarEvents: ["id", "title", "courseCode", "startDate", "endDate", "type", "location"]
};

function getSpreadsheet() {
  try { return SpreadsheetApp.getActiveSpreadsheet(); }
  catch (e) { return SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId()); }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.fetchFeed) {
      const resp = UrlFetchApp.fetch(e.parameter.fetchFeed, { muteHttpExceptions: true });
      return ContentService.createTextOutput(resp.getContentText()).setMimeType(ContentService.MimeType.TEXT);
    }
    const ss = getSpreadsheet();
    let courses = getRowsAsObjects(ss.getSheetByName("Courses"));
    let deliverables = getRowsAsObjects(ss.getSheetByName("Deliverables"));
    let sheetEvents = getRowsAsObjects(ss.getSheetByName("CalendarEvents"));

    let gcalEvents = [];
    if (e && e.parameter && e.parameter.syncGCal === "true") {
      gcalEvents = getGoogleCalendarEvents();
    }

    const eventMap = new Map();
    sheetEvents.forEach(function(ev) {
      eventMap.set((ev.title || "").trim().toLowerCase() + "_" + (ev.startDate || "").slice(0, 16), ev);
    });
    gcalEvents.forEach(function(ev) {
      const key = (ev.title || "").trim().toLowerCase() + "_" + (ev.startDate || "").slice(0, 16);
      if (!eventMap.has(key)) eventMap.set(key, ev);
    });

    const data = {
      courses: courses,
      deliverables: deliverables,
      calendarEvents: Array.from(eventMap.values()),
      lastSynced: new Date().toISOString()
    };
    return ContentService.createTextOutput(JSON.stringify({ success: true, data, lastSynced: data.lastSynced })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Missing body" })).setMimeType(ContentService.MimeType.JSON);
    }
    const payload = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet();

    if (payload.courses && Array.isArray(payload.courses)) {
      writeObjectsToSheet(getOrCreateSheet(ss, "Courses", DEFAULT_HEADERS.Courses), payload.courses, DEFAULT_HEADERS.Courses);
    }
    if (payload.deliverables && Array.isArray(payload.deliverables)) {
      writeObjectsToSheet(getOrCreateSheet(ss, "Deliverables", DEFAULT_HEADERS.Deliverables), payload.deliverables, DEFAULT_HEADERS.Deliverables);
    }
    if (payload.calendarEvents && Array.isArray(payload.calendarEvents)) {
      writeObjectsToSheet(getOrCreateSheet(ss, "CalendarEvents", DEFAULT_HEADERS.CalendarEvents), payload.calendarEvents, DEFAULT_HEADERS.CalendarEvents);
      if (payload.syncToGCal === true || payload.syncToGCal === undefined) {
        syncEventsToGoogleCalendar(payload.calendarEvents);
      }
    }

    const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Trang tính 1");
    if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
      try { ss.deleteSheet(defaultSheet); } catch (ignored) {}
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, timestamp: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getGoogleCalendarEvents() {
  try {
    const cal = CalendarApp.getDefaultCalendar();
    if (!cal) return [];
    const now = new Date();
    const events = cal.getEvents(new Date(now.getTime() - 14 * 86400000), new Date(now.getTime() + 90 * 86400000));
    return events.map(function(ev) {
      const title = ev.getTitle() || "Untitled Event";
      let type = "LECTURE";
      const lower = title.toLowerCase();
      if (lower.includes("exam") || lower.includes("thi") || lower.includes("midterm") || lower.includes("final")) type = "EXAM";
      else if (lower.includes("assignment") || lower.includes("due") || lower.includes("bài tập")) type = "ASSIGNMENT";
      const match = title.match(/\\b([A-Z]{2,4}\\s?\\d{3})\\b/i);
      return {
        id: "gcal-" + ev.getId(),
        title: title,
        courseCode: match ? match[1].replace(/\\s+/, "").toUpperCase() : "",
        startDate: ev.getStartTime().toISOString(),
        endDate: ev.getEndTime().toISOString(),
        type: type,
        location: ev.getLocation() || "",
        description: ev.getDescription() || ""
      };
    });
  } catch (err) { return []; }
}

function syncEventsToGoogleCalendar(calendarEvents) {
  try {
    const cal = CalendarApp.getDefaultCalendar();
    if (!cal || !calendarEvents || !Array.isArray(calendarEvents)) return 0;
    let count = 0;
    calendarEvents.forEach(function(ev) {
      if (!ev.title || !ev.startDate) return;
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 3600000);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
      if (ev.id && ev.id.indexOf("gcal-") === 0) {
        try {
          const ex = cal.getEventById(ev.id.substring(5));
          if (ex) { ex.setTitle(ev.title); ex.setTime(start, end); if (ev.location) ex.setLocation(ev.location); count++; return; }
        } catch(e) {}
      }
      const existing = cal.getEvents(new Date(start.getTime() - 60000), new Date(start.getTime() + 60000));
      if (!existing.some(function(ex) { return ex.getTitle().trim().toLowerCase() === ev.title.trim().toLowerCase(); })) {
        cal.createEvent(ev.title, start, end, { location: ev.location || "", description: "Synced from Student Hub" });
        count++;
      }
    });
    return count;
  } catch (err) { return 0; }
}

function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getRowsAsObjects(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = values[i][j];
      row[headers[j]] = val;
      if (val !== "" && val !== null && val !== undefined) hasData = true;
    }
    if (hasData) rows.push(row);
  }
  return rows;
}

function writeObjectsToSheet(sheet, objects, fallbackHeaders) {
  if (!sheet) return;
  let lastCol = sheet.getLastColumn();
  let headers = [];
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim()).filter(h => h.length > 0);
  }
  if (headers.length === 0) {
    headers = fallbackHeaders || (objects.length > 0 ? Object.keys(objects[0]) : []);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  if (headers.length === 0) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  if (!objects || objects.length === 0) return;
  const dataRows = objects.map(obj => headers.map(header => (obj[header] !== undefined && obj[header] !== null ? obj[header] : "")));
  if (dataRows.length > 0) sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
}`

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
  const [isCodeCopied, setIsCodeCopied] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => {
      setIsCodeCopied(true)
      setTimeout(() => setIsCodeCopied(false), 3000)
    })
  }

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
    if (!endpointUrl.trim()) {
      setSyncStatus('Please enter your Google Apps Script Web App URL first.')
      return
    }

    setIsPulling(true)
    setSyncStatus(null)
    const currentConfig: CloudSyncConfig = {
      enabled: true,
      provider,
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim(),
      workspaceId: workspaceId.trim(),
    }
    setEnabled(true)

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
    if (!endpointUrl.trim()) {
      setSyncStatus('Please enter your Google Apps Script Web App URL first.')
      return
    }

    setIsSyncing(true)
    setSyncStatus(null)
    const currentConfig: CloudSyncConfig = {
      enabled: true,
      provider,
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim(),
      workspaceId: workspaceId.trim(),
    }
    setEnabled(true)

    try {
      const res = await syncWorkspaceToCloud(appData, currentConfig)
      setSyncStatus(res.message)
      onSaveConfig({ ...currentConfig, lastSynced: res.lastSynced })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSave = () => {
    const isAutoEnabled = enabled || endpointUrl.trim().length > 0
    onSaveConfig({
      enabled: isAutoEnabled,
      provider,
      endpointUrl: endpointUrl.trim(),
      apiKey: apiKey.trim(),
      workspaceId: workspaceId.trim(),
      lastSynced: config.lastSynced,
    })
    setEnabled(isAutoEnabled)
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

          {/* Google Sheets Quick Setup Helper */}
          {provider === 'google_sheets' && (
            <div className="p-3.5 rounded-xl bg-[#1B2220] border border-[#2D3834] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sheet className="w-4 h-4 text-[#5B8266]" />
                  <span className="font-semibold text-[#E0E6E4]">Google Sheets Quick Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131716] border border-[#2D3834] hover:border-[#3A4742] text-[11px] text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
                  >
                    <span>Create Sheet (sheets.new)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5B8266]/20 border border-[#5B8266]/40 text-[#5B9975] hover:bg-[#5B8266]/30 text-[11px] font-medium transition-colors"
                  >
                    {isCodeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isCodeCopied ? 'Code Copied!' : 'Copy Apps Script Code'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                className="flex items-center justify-between w-full text-[11px] text-[#8C9E96] hover:text-[#E0E6E4] pt-1 border-t border-[#2D3834]/60"
              >
                <span>Setup Checklist (3 Tab Names & Web App Deployment)</span>
                {showSetupGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSetupGuide && (
                <div className="text-[11px] space-y-2 pt-1 font-mono text-[#8C9E96] bg-[#131716] p-3 rounded-lg border border-[#2D3834]">
                  <div>
                    <strong className="text-[#E0E6E4]">Step 1:</strong> Create 3 sheets named exactly:
                    <ul className="list-disc list-inside mt-1 text-[#B89674]">
                      <li><code className="text-[#5B9975]">Courses</code></li>
                      <li><code className="text-[#5B9975]">Deliverables</code></li>
                      <li><code className="text-[#5B9975]">CalendarEvents</code></li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-[#E0E6E4]">Step 2:</strong> In Google Sheets, click <span className="text-[#E0E6E4]">Extensions &gt; Apps Script</span>, paste the code, and click Save.
                  </div>
                  <div>
                    <strong className="text-[#E0E6E4]">Step 3:</strong> Click <span className="text-[#E0E6E4]">Deploy &gt; New deployment &gt; Web app</span>:
                    <ul className="list-disc list-inside mt-0.5 text-[#B89674]">
                      <li>Execute as: <span className="text-[#E0E6E4]">Me</span></li>
                      <li>Who has access: <span className="text-[#5B9975] font-semibold">Anyone</span> (Crucial!)</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-[#E0E6E4]">Step 4:</strong> Authorize access, copy the URL ending in <span className="text-[#5B9975]">/exec</span>, and paste below.
                  </div>
                </div>
              )}
            </div>
          )}

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
              onChange={(e) => {
                setEndpointUrl(e.target.value)
                if (e.target.value.trim().length > 0 && !enabled) {
                  setEnabled(true)
                }
              }}
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
