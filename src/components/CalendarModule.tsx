import React, { useRef, useState, useMemo } from 'react'
import type { CalendarEvent, Course, Deliverable, Project } from '../types'
import {
  getCalendarDaysForMonth,
  getWeekDays,
  getEventsForDate,
  formatTimeShort,
  filterNext7DaysEvents,
  parseICS,
  convertEventToDeliverable,
  detectScheduleConflicts,
  detectBufferOverlaps,
} from '../utils/calendarEngine'
import { CalendarEventModal } from './CalendarEventModal'
import {
  Calendar as CalendarIcon,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Check,
  Grid,
  Columns,
  List,
  Trash2,
  Edit2,
  ShieldAlert,
  AlertTriangle,
  Globe,
  RefreshCw,
  X,
  CalendarCheck,
} from 'lucide-react'

interface CalendarModuleProps {
  calendarEvents: CalendarEvent[]
  projects: Project[]
  courses: Course[]
  deliverables?: Deliverable[]
  currentUser: string
  onUpdateCalendarEvents: (events: CalendarEvent[]) => void
  onAddDeliverable: (deliverable: Deliverable) => void
  onSelectBufferTab: () => void
}

type CalendarViewMode = 'MONTH' | 'WEEK' | 'AGENDA'

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  calendarEvents = [],
  projects = [],
  courses = [],
  deliverables = [],
  currentUser,
  onUpdateCalendarEvents,
  onAddDeliverable,
  onSelectBufferTab,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH')
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL')

  // Date navigation state
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)
  const [convertedEventId, setConvertedEventId] = useState<string | null>(null)

  // WebCal subscription states
  const [isWebCalModalOpen, setIsWebCalModalOpen] = useState(false)
  const [webCalUrl, setWebCalUrl] = useState(() => {
    try {
      return localStorage.getItem('student_dashboard_webcal_url') || ''
    } catch {
      return ''
    }
  })
  const [isFetchingWebCal, setIsFetchingWebCal] = useState(false)
  const [webCalError, setWebCalError] = useState<string | null>(null)
  const [webCalSuccess, setWebCalSuccess] = useState<string | null>(null)
  const [showConflictDetails, setShowConflictDetails] = useState(false)
  const [isSyncingGCal, setIsSyncingGCal] = useState(false)
  const [gcalMessage, setGcalMessage] = useState<string | null>(null)

  // 2-Way Google Calendar Sync handler
  const handleSyncGoogleCalendar = async () => {
    let gasUrl = ''
    try {
      const savedData = localStorage.getItem('student_hub_app_data_v1')
      if (savedData) {
        const parsed = JSON.parse(savedData)
        if (parsed.cloudSync?.endpointUrl && parsed.cloudSync?.endpointUrl.includes('script.google.com')) {
          gasUrl = parsed.cloudSync.endpointUrl
        }
      }
    } catch {
      // ignore
    }

    if (!gasUrl) {
      alert(
        'Please connect your Google Apps Script Web App URL first in Cloud Sync (Header > Cloud Sync) to enable Google Calendar 2-Way sync!'
      )
      return
    }

    setIsSyncingGCal(true)
    setGcalMessage(null)
    try {
      const syncUrl = `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}syncGCal=true`
      const res = await fetch(syncUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const json = await res.json()
      if (json.success && json.data) {
        if (json.data.gcalError) {
          alert(`Google Calendar note: ${json.data.gcalError}\n\nPlease open Apps Script editor, select "testCalendarSync" function and click "Run" to authorize access.`)
        }

        const remoteEvents = (json.data.calendarEvents || []) as CalendarEvent[]
        const scanned = (json.data.calendarsScanned || []) as string[]
        const gcalCount = json.data.gcalCount ?? 0

        // Reset course filter so downloaded events are not hidden
        setSelectedCourseFilter('ALL')

        const eventMap = new Map<string, CalendarEvent>()
        calendarEvents.forEach((e) => {
          const key = `${e.title.trim().toLowerCase()}_${e.startDate.slice(0, 16)}`
          eventMap.set(key, e)
        })

        let addedCount = 0
        remoteEvents.forEach((e) => {
          const key = `${e.title.trim().toLowerCase()}_${e.startDate.slice(0, 16)}`
          if (!eventMap.has(key)) {
            eventMap.set(key, e)
            addedCount++
          }
        })

        const merged = Array.from(eventMap.values())
        onUpdateCalendarEvents(merged)

        const calSummary = scanned.length > 0 ? ` [${scanned.slice(0, 2).join(', ')}]` : ''
        setGcalMessage(
          `Google Calendar synced! Scanned ${scanned.length} calendars${calSummary}. Loaded ${gcalCount} events (+${addedCount} new).`
        )
        setTimeout(() => setGcalMessage(null), 6000)
      } else {
        throw new Error(json.error || 'Failed to fetch Google Calendar events')
      }
    } catch (err: any) {
      alert(`Google Calendar sync error: ${err.message}. Ensure your script is deployed as Web App with "Who has access: Anyone".`)
    } finally {
      setIsSyncingGCal(false)
    }
  }

  // Filter events by course
  const filteredEvents = calendarEvents.filter((ev) => {
    if (selectedCourseFilter === 'ALL') return true
    return ev.courseCode?.toLowerCase() === selectedCourseFilter.toLowerCase()
  })

  // Workload Health & Conflict Detection
  const scheduleConflicts = useMemo(() => detectScheduleConflicts(filteredEvents), [filteredEvents])
  const bufferCongestions = useMemo(() => detectBufferOverlaps(deliverables), [deliverables])
  const totalWarnings = scheduleConflicts.length + bufferCongestions.length

  const handleSyncWebCal = async (urlOverride?: string) => {
    const target = urlOverride || webCalUrl
    if (!target.trim()) return
    setIsFetchingWebCal(true)
    setWebCalError(null)
    setWebCalSuccess(null)

    try {
      let fetchUrl = target.trim()
      if (fetchUrl.startsWith('webcal://')) {
        fetchUrl = 'https://' + fetchUrl.substring(9)
      }

      let text = ''
      let usedProxy = false

      // Attempt 1: Direct browser fetch
      try {
        const res = await fetch(fetchUrl)
        if (res.ok) {
          text = await res.text()
        }
      } catch {
        // Direct fetch blocked by CORS; proceed to fallback proxy
      }

      // Attempt 2: Multi-proxy CORS fallbacks
      if (!text) {
        let gasUrl = ''
        try {
          const savedData = localStorage.getItem('student_hub_app_data_v1')
          if (savedData) {
            const parsed = JSON.parse(savedData)
            if (parsed.cloudSync?.endpointUrl && parsed.cloudSync?.endpointUrl.includes('script.google.com')) {
              gasUrl = parsed.cloudSync.endpointUrl
            }
          }
        } catch {
          // ignore
        }

        const proxies: ((u: string) => string)[] = [
          ...(gasUrl ? [(u: string) => `${gasUrl}${gasUrl.includes('?') ? '&' : '?'}fetchFeed=${encodeURIComponent(u)}`] : []),
          (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
          (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
          (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        ]

        for (const makeProxy of proxies) {
          try {
            const proxyUrl = makeProxy(fetchUrl)
            const proxyRes = await fetch(proxyUrl)
            if (proxyRes.ok) {
              const candidate = await proxyRes.text()
              if (candidate && candidate.includes('BEGIN:VCALENDAR')) {
                text = candidate
                usedProxy = true
                break
              }
            }
          } catch {
            // Continue to next fallback
          }
        }
      }

      if (!text || !text.includes('BEGIN:VCALENDAR')) {
        throw new Error(
          'University LMS CORS restriction: Your LMS portal blocks cross-origin web requests from external sites.'
        )
      }

      const parsed = parseICS(text)
      if (parsed.length === 0) {
        setWebCalError('No calendar events (VEVENT) found in this URL feed.')
        return
      }

      const existing = new Set(calendarEvents.map((e) => `${e.title}_${e.startDate}`))
      const toAdd = parsed.filter((e) => !existing.has(`${e.title}_${e.startDate}`))
      onUpdateCalendarEvents([...calendarEvents, ...toAdd])

      try {
        localStorage.setItem('student_dashboard_webcal_url', target)
      } catch {
        // ignore
      }

      setWebCalSuccess(
        `Synchronized! Added ${toAdd.length} new events${usedProxy ? ' (via CORS bridge)' : ''}.`
      )
      setTimeout(() => {
        setIsWebCalModalOpen(false)
        setWebCalSuccess(null)
      }, 1500)
    } catch {
      setWebCalError(
        'Your university LMS (Canvas/Blackboard) blocks in-browser cross-origin requests (CORS). Download the .ics file from Canvas/Google Calendar and use "Upload .ics File" below.'
      )
    } finally {
      setIsFetchingWebCal(false)
    }
  }

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    }
  }

  const handleNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Calendar calculations
  const monthDays = getCalendarDaysForMonth(currentDate.getFullYear(), currentDate.getMonth())
  const weekDays = getWeekDays(currentDate)
  const next7DaysDeadlines = filterNext7DaysEvents(filteredEvents)

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekRangeName = `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // File import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseICS(text)
        if (parsed.length === 0) {
          alert('No valid events found in the uploaded .ics file.')
          return
        }
        onUpdateCalendarEvents([...calendarEvents, ...parsed])
        alert(`Successfully imported ${parsed.length} academic calendar events!`)
      } catch (err: any) {
        alert(`Error parsing .ics file: ${err.message}`)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  // 1-Click Buffer Table Conversion
  const handleConvertToDeliverable = (ev: CalendarEvent) => {
    const targetProject = projects.find(
      (p) => ev.courseCode && p.courseCode.toLowerCase() === ev.courseCode.toLowerCase()
    ) || projects[0]

    const newDeliverable = convertEventToDeliverable(ev, targetProject?.id || 'p-dsa', currentUser)
    onAddDeliverable(newDeliverable)

    const updatedEvents = calendarEvents.map((item) =>
      item.id === ev.id ? { ...item, isBufferConverted: true } : item
    )
    onUpdateCalendarEvents(updatedEvents)

    setConvertedEventId(ev.id)
    setTimeout(() => setConvertedEventId(null), 3000)
  }

  const handleSaveEvent = (data: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    let savedEvent: CalendarEvent
    if (data.id) {
      savedEvent = { ...data, id: data.id } as CalendarEvent
      onUpdateCalendarEvents(calendarEvents.map((ev) => (ev.id === data.id ? savedEvent : ev)))
    } else {
      savedEvent = {
        ...data,
        id: `cal-${Date.now()}`,
      }
      onUpdateCalendarEvents([...calendarEvents, savedEvent])
    }

    // Auto-sync event to Google Calendar in background if Google Apps Script is connected
    try {
      const savedData = localStorage.getItem('student_hub_app_data_v1')
      if (savedData) {
        const parsed = JSON.parse(savedData)
        if (parsed.cloudSync?.endpointUrl && parsed.cloudSync?.endpointUrl.includes('script.google.com')) {
          fetch(parsed.cloudSync.endpointUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              calendarEvents: [savedEvent],
              syncToGCal: true,
            }),
          }).catch(() => {})
        }
      }
    } catch {
      // ignore background sync errors
    }
  }

  const handleDeleteEvent = (id: string) => {
    if (confirm('Delete this event from your academic schedule?')) {
      onUpdateCalendarEvents(calendarEvents.filter((ev) => ev.id !== id))
    }
  }

  // Style badge helper
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'EXAM':
        return 'bg-[#5B8266]/25 border-[#5B8266]/40 text-[#5B8266]'
      case 'LAB':
        return 'bg-[#5B9975]/25 border-[#5B9975]/40 text-[#5B9975]'
      case 'LECTURE':
        return 'bg-[#648381]/25 border-[#648381]/40 text-[#E0E6E4]'
      case 'MILESTONE':
        return 'bg-[#997A5B]/25 border-[#997A5B]/40 text-[#B89674]'
      case 'ASSIGNMENT':
        return 'bg-[#9E5B5B]/25 border-[#9E5B5B]/40 text-[#D48B8B]'
      case 'STUDY_SESSION':
        return 'bg-[#7E6B8F]/25 border-[#7E6B8F]/40 text-[#BFA8D1]'
      default:
        return 'bg-[#1B2220] border-[#2D3834] text-[#8C9E96]'
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="calendar-title">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-[#2D3834] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="calendar-title" className="text-lg font-semibold tracking-tight text-[#E0E6E4]">
              Academic Calendar &amp; Class Schedule
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B8266]/20 text-[#5B8266] border border-[#5B8266]/30 font-mono">
              Month &bull; Week &bull; Agenda
            </span>
          </div>
          <p className="text-xs text-[#8C9E96]">
            Interactive timetable of lectures, lab sessions, and 72h safety buffer submission gates
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#1B2220] text-xs text-[#E0E6E4] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#648381]" />
            <span>Import .ics</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ical"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => setIsWebCalModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#1B2220] text-xs text-[#E0E6E4] transition-colors"
            title="Subscribe to live WebCal / iCal URL feed"
          >
            {webCalUrl ? (
              <RefreshCw className={`w-3.5 h-3.5 text-[#5B8266] ${isFetchingWebCal ? 'animate-spin' : ''}`} />
            ) : (
              <Globe className="w-3.5 h-3.5 text-[#648381]" />
            )}
            <span>{webCalUrl ? 'Sync WebCal' : 'WebCal URL'}</span>
          </button>

          <button
            onClick={handleSyncGoogleCalendar}
            disabled={isSyncingGCal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5B8266]/40 hover:border-[#5B8266] bg-[#18261F] text-xs font-medium text-[#5B9975] hover:text-[#E0E6E4] transition-colors disabled:opacity-50"
            title="2-Way Sync with Google Calendar"
          >
            <CalendarCheck className={`w-3.5 h-3.5 text-[#5B9975] ${isSyncingGCal ? 'animate-spin' : ''}`} />
            <span>{isSyncingGCal ? 'Syncing...' : 'Sync Google Calendar'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedDateForNewEvent(new Date())
              setEventToEdit(null)
              setIsEventModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class / Event</span>
          </button>
        </div>
      </div>

      {/* Google Calendar Notification Banner */}
      {gcalMessage && (
        <div className="p-3 rounded-xl bg-[#18261F] border border-[#5B9975]/30 text-xs text-[#5B9975] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#5B9975] shrink-0" />
            <span>{gcalMessage}</span>
          </div>
          <button onClick={() => setGcalMessage(null)} className="text-[#8C9E96] hover:text-[#E0E6E4]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workload Health & Conflict Warning Banner */}
      {totalWarnings > 0 && (
        <div className="p-3.5 rounded-xl bg-[#1B2220] border border-[#997A5B]/40 transition-all">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#997A5B]/20 text-[#997A5B]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#E0E6E4]">
                  Workload Stress &amp; Conflict Alert ({totalWarnings} {totalWarnings === 1 ? 'Notice' : 'Notices'})
                </div>
                <div className="text-[11px] text-[#8C9E96]">
                  {scheduleConflicts.length > 0 && `${scheduleConflicts.length} schedule/exam conflict${scheduleConflicts.length > 1 ? 's' : ''}`}
                  {scheduleConflicts.length > 0 && bufferCongestions.length > 0 && ' • '}
                  {bufferCongestions.length > 0 && `${bufferCongestions.length} internal buffer crunch${bufferCongestions.length > 1 ? 'es' : ''}`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConflictDetails(!showConflictDetails)}
              className="text-xs text-[#997A5B] hover:text-[#B89674] underline font-medium cursor-pointer"
            >
              {showConflictDetails ? 'Hide Details' : 'Review Warnings'}
            </button>
          </div>

          {showConflictDetails && (
            <div className="mt-3 pt-3 border-t border-[#2D3834] space-y-2 text-xs font-mono">
              {scheduleConflicts.map((c) => (
                <div key={c.id} className="p-2 rounded-lg bg-[#131716] border border-[#2D3834] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      c.conflictType === 'EXAM_CRUNCH' ? 'bg-[#A36262]/20 text-[#A36262]' : 'bg-[#997A5B]/20 text-[#997A5B]'
                    }`}>
                      {c.conflictType}
                    </span>
                    <span className="text-[#E0E6E4]">{c.message}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCurrentDate(new Date(c.date))
                      setViewMode('WEEK')
                    }}
                    className="text-[11px] text-[#5B8266] hover:underline shrink-0 cursor-pointer"
                  >
                    View in Week
                  </button>
                </div>
              ))}

              {bufferCongestions.map((b) => (
                <div key={b.date} className="p-2 rounded-lg bg-[#131716] border border-[#2D3834] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#997A5B]/20 text-[#997A5B]">
                      BUFFER CRUNCH
                    </span>
                    <span className="text-[#E0E6E4]">{b.message}</span>
                  </div>
                  <button
                    onClick={onSelectBufferTab}
                    className="text-[11px] text-[#5B8266] hover:underline shrink-0 cursor-pointer"
                  >
                    Manage Buffers
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Control Bar: View Switcher, Course Filter & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-[#1B2220] border border-[#2D3834]">
        {/* Navigation (< Today > Month/Week Label) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#131716] p-0.5 rounded-lg border border-[#2D3834]">
            <button
              onClick={handlePrev}
              className="p-1 text-[#8C9E96] hover:text-[#E0E6E4] rounded hover:bg-[#1B2220] transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2 py-0.5 text-xs font-medium text-[#E0E6E4] rounded hover:bg-[#1B2220] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-[#8C9E96] hover:text-[#E0E6E4] rounded hover:bg-[#1B2220] transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="font-semibold text-xs sm:text-sm text-[#E0E6E4] font-mono">
            {viewMode === 'MONTH' ? monthName : viewMode === 'WEEK' ? weekRangeName : 'Upcoming Deadlines'}
          </span>
        </div>

        {/* Middle: Course Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8C9E96] font-medium hidden md:inline">Course:</span>
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#131716] border border-[#2D3834] text-xs text-[#E0E6E4] font-mono outline-none"
          >
            <option value="ALL">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Right: View Mode Toggle Tabs */}
        <div className="flex items-center gap-1 bg-[#131716] p-1 rounded-lg border border-[#2D3834] self-start sm:self-auto">
          <button
            onClick={() => setViewMode('MONTH')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'MONTH'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Month</span>
          </button>

          <button
            onClick={() => setViewMode('WEEK')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'WEEK'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-[#648381]" />
            <span>Week</span>
          </button>

          <button
            onClick={() => setViewMode('AGENDA')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewMode === 'AGENDA'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <List className="w-3.5 h-3.5 text-[#997A5B]" />
            <span>Agenda &amp; Buffer</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MONTH GRID */}
      {viewMode === 'MONTH' && (
        <div className="rounded-2xl border border-[#2D3834] bg-[#171E1C] overflow-hidden shadow-xl">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[#2D3834] bg-[#131716] text-center text-[11px] font-mono font-semibold text-[#8C9E96] py-2.5">
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
            <div>SUN</div>
          </div>

          {/* Month Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#2D3834]/60 bg-[#171E1C]">
            {monthDays.map((cell) => {
              const dayEvents = getEventsForDate(filteredEvents, cell.date)

              return (
                <div
                  key={cell.dateString}
                  onClick={() => {
                    setSelectedDateForNewEvent(cell.date)
                    setEventToEdit(null)
                    setIsEventModalOpen(true)
                  }}
                  className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 cursor-pointer transition-colors relative flex flex-col justify-between group hover:bg-[#1B2220] ${
                    cell.isToday
                      ? 'bg-[#1D221F]/60 ring-1 ring-inset ring-[#5B8266]/40'
                      : !cell.isCurrentMonth
                      ? 'opacity-35 bg-[#131716]/40'
                      : ''
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-medium ${
                        cell.isToday
                          ? 'w-6 h-6 rounded-full bg-[#5B8266] text-[#E0E6E4] flex items-center justify-center font-bold'
                          : cell.isCurrentMonth
                          ? 'text-[#E0E6E4]'
                          : 'text-[#8C9E96]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDateForNewEvent(cell.date)
                        setEventToEdit(null)
                        setIsEventModalOpen(true)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-[#8C9E96] hover:text-[#E0E6E4] transition-opacity"
                      title="Add event on this date"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Event Pills inside Day Cell */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px]">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEventToEdit(ev)
                          setIsEventModalOpen(true)
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate border font-mono transition-transform hover:scale-[1.02] ${getBadgeStyle(
                          ev.type
                        )}`}
                        title={`${ev.title} (${formatTimeShort(ev.startDate)})`}
                      >
                        <span className="font-bold mr-1">{formatTimeShort(ev.startDate)}</span>
                        <span>{ev.courseCode ? `[${ev.courseCode}] ` : ''}{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] font-mono text-[#8C9E96] px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: WEEK TIMETABLE SCHEDULE */}
      {viewMode === 'WEEK' && (
        <div className="rounded-2xl border border-[#2D3834] bg-[#171E1C] overflow-hidden shadow-xl">
          <div className="p-3 bg-[#131716] border-b border-[#2D3834] flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-[#8C9E96]">
              Weekly Academic Schedule &bull; {weekRangeName}
            </span>
            <span className="text-[11px] text-[#5B8266] font-mono">
              Click any column to schedule a class session
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-[#2D3834]/60 bg-[#171E1C] min-h-[450px]">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDate(filteredEvents, day.date)
              const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' })

              return (
                <div
                  key={day.dateString}
                  onClick={() => {
                    setSelectedDateForNewEvent(day.date)
                    setEventToEdit(null)
                    setIsEventModalOpen(true)
                  }}
                  className={`p-3 flex flex-col justify-start space-y-2 cursor-pointer group hover:bg-[#1B2220]/70 transition-colors ${
                    day.isToday ? 'bg-[#1B2220]/50 ring-1 ring-inset ring-[#5B8266]/30' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#2D3834]/60">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C9E96]">
                        {dayName}
                      </div>
                      <div
                        className={`text-sm font-mono font-bold ${
                          day.isToday ? 'text-[#5B8266]' : 'text-[#E0E6E4]'
                        }`}
                      >
                        {day.dayNumber}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDateForNewEvent(day.date)
                        setEventToEdit(null)
                        setIsEventModalOpen(true)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8C9E96] hover:text-[#E0E6E4] transition-opacity"
                      title="Add event"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Event Cards inside Day Column */}
                  <div className="space-y-2 flex-1">
                    {dayEvents.length === 0 ? (
                      <div className="text-[10px] text-[#8C9E96] italic py-4 text-center">
                        No scheduled classes
                      </div>
                    ) : (
                      dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEventToEdit(ev)
                            setIsEventModalOpen(true)
                          }}
                          className={`p-2 rounded-xl border text-xs flex flex-col justify-between space-y-1 transition-transform hover:scale-[1.02] shadow-sm ${getBadgeStyle(
                            ev.type
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold font-mono px-1 rounded bg-[#131716]/60">
                              {ev.courseCode || ev.type}
                            </span>
                            <div className="flex items-center gap-1 opacity-80">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteEvent(ev.id)
                                }}
                                className="hover:text-[#A36262]"
                                title="Delete event"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <h4 className="font-semibold text-[11px] text-[#E0E6E4] line-clamp-2 leading-tight">
                            {ev.title}
                          </h4>

                          <div className="text-[10px] font-mono text-[#E0E6E4]/80 flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{formatTimeShort(ev.startDate)}</span>
                            {ev.endDate && <span>- {formatTimeShort(ev.endDate)}</span>}
                          </div>

                          {ev.location && (
                            <div className="text-[10px] text-[#8C9E96] flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}

                          {/* 72h conversion button if exam or assignment */}
                          {(ev.type === 'EXAM' || ev.type === 'ASSIGNMENT' || ev.type === 'MILESTONE') && (
                            <div className="pt-1 border-t border-current/20 flex justify-end">
                              {ev.isBufferConverted || convertedEventId === ev.id ? (
                                <span className="text-[9px] text-[#5B9975] flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Added to Buffer
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleConvertToDeliverable(ev)
                                  }}
                                  className="text-[9px] hover:underline font-bold flex items-center gap-1"
                                >
                                  <ShieldAlert className="w-2.5 h-2.5" />
                                  <span>+ 72h Buffer</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: AGENDA & BUFFER TRACKER */}
      {viewMode === 'AGENDA' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] flex items-center justify-between">
            <span className="text-xs text-[#8C9E96]">
              Showing <strong className="text-[#E0E6E4]">{next7DaysDeadlines.length}</strong> upcoming deadlines due within the next 7 days.
            </span>
            <button
              onClick={onSelectBufferTab}
              className="text-xs text-[#5B8266] hover:text-[#6E997B] font-medium underline"
            >
              Open Milestone Buffer Table &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] hover:border-[#3A4742] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${getBadgeStyle(ev.type)}`}>
                        {ev.type}
                      </span>
                      {ev.courseCode && (
                        <span className="font-mono text-xs text-[#E0E6E4] font-medium px-1.5 py-0.5 rounded bg-[#131716] border border-[#2D3834]">
                          {ev.courseCode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEventToEdit(ev)
                          setIsEventModalOpen(true)
                        }}
                        className="p-1 text-[#8C9E96] hover:text-[#E0E6E4]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1 text-[#8C9E96] hover:text-[#A36262]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-semibold text-[#E0E6E4] line-clamp-2">
                    {ev.title}
                  </h3>
                  {ev.description && (
                    <p className="text-[11px] text-[#8C9E96] mt-1 line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#2D3834]/60 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[#8C9E96] text-[11px]">
                    <span className="flex items-center gap-1 text-[#E0E6E4]">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#5B8266]" />
                      {new Date(ev.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTimeShort(ev.startDate)}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1 truncate max-w-[130px]">
                        <MapPin className="w-3 h-3 text-[#648381]" />
                        {ev.location}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {ev.isBufferConverted || convertedEventId === ev.id ? (
                      <span className="text-[11px] text-[#5B9975] flex items-center gap-1 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        <span>Buffer Task Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConvertToDeliverable(ev)}
                        className="text-[11px] text-[#5B8266] hover:text-[#6E997B] font-medium flex items-center gap-1 transition-colors"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Convert to 72h Safety Buffer Task</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Event Modal (Create or Edit) */}
      {isEventModalOpen && (
        <CalendarEventModal
          event={eventToEdit}
          initialDate={selectedDateForNewEvent}
          courses={courses}
          isOpen={true}
          onClose={() => {
            setIsEventModalOpen(false)
            setEventToEdit(null)
          }}
          onSave={handleSaveEvent}
        />
      )}

      {/* WebCal URL Subscription Modal */}
      {isWebCalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#1B2220] border border-[#2D3834] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#5B8266]" />
                <h3 className="text-sm font-semibold text-[#E0E6E4]">Subscribe to WebCal / iCal Feed</h3>
              </div>
              <button
                onClick={() => setIsWebCalModalOpen(false)}
                className="text-[#8C9E96] hover:text-[#E0E6E4] p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8C9E96] leading-relaxed">
              Enter the subscription URL from Canvas, Blackboard, or Google Calendar (e.g., <code className="font-mono text-[11px] text-[#5B8266]">https://.../calendar.ics</code> or <code className="font-mono text-[11px] text-[#5B8266]">webcal://...</code>).
            </p>
            <div>
              <input
                type="url"
                value={webCalUrl}
                onChange={(e) => {
                  setWebCalUrl(e.target.value)
                  setWebCalError(null)
                }}
                placeholder="https://canvas.instructure.com/feeds/calendars/user_xyz.ics"
                className="w-full px-3 py-2 rounded-xl bg-[#131716] border border-[#2D3834] text-xs text-[#E0E6E4] font-mono focus:border-[#5B8266] focus:outline-none"
              />
            </div>

            {/* Error Notification with Direct 1-Click Upload */}
            {webCalError && (
              <div className="p-3 rounded-xl bg-[#261E1A] border border-[#997A5B]/40 text-xs text-[#E0E6E4] space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#997A5B] shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-[#D9C3B0]">
                    {webCalError}
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWebCalModalOpen(false)
                      fileInputRef.current?.click()
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#997A5B]/20 hover:bg-[#997A5B]/30 border border-[#997A5B]/50 text-xs text-[#D9C3B0] font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#997A5B]" />
                    <span>Upload Downloaded .ics File</span>
                  </button>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {webCalSuccess && (
              <div className="p-3 rounded-xl bg-[#18261F] border border-[#5B9975]/30 text-xs text-[#5B9975] flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{webCalSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2D3834]">
              <button
                type="button"
                onClick={() => {
                  setIsWebCalModalOpen(false)
                  fileInputRef.current?.click()
                }}
                className="text-xs text-[#8C9E96] hover:text-[#E0E6E4] flex items-center gap-1"
                title="Select .ics file from your hard drive"
              >
                <Upload className="w-3 h-3" />
                <span>Import local file</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWebCalModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSyncWebCal()}
                  disabled={isFetchingWebCal || !webCalUrl.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-semibold text-[#E0E6E4] disabled:opacity-50 transition-colors"
                >
                  {isFetchingWebCal && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isFetchingWebCal ? 'Syncing...' : 'Save & Sync'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
