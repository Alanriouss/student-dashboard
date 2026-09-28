import type { CalendarEvent, Deliverable, EventType, ScheduleConflict, BufferCongestion } from '../types'
import { computeDefaultBufferDate } from './bufferEngine'

export interface CalendarDayCell {
  date: Date
  dateString: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
}

export function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const cleanContent = icsContent.replace(/\r\n /g, '').replace(/\n /g, '') // Unfold multi-line strings
  const lines = cleanContent.split(/\r\n|\n|\r/)

  let inEvent = false
  let currentEvent: Partial<CalendarEvent> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = {
        id: `cal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      }
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && currentEvent.title && currentEvent.startDate) {
        const title = currentEvent.title
        const detectedType = detectEventType(title, currentEvent.description || '')
        const detectedCourse = detectCourseCode(title)

        events.push({
          id: currentEvent.id || `cal-${Date.now()}`,
          title,
          startDate: currentEvent.startDate,
          endDate: currentEvent.endDate,
          type: detectedType,
          courseCode: detectedCourse,
          location: currentEvent.location,
          description: currentEvent.description,
          isBufferConverted: false,
        })
      }
      inEvent = false
      currentEvent = {}
      continue
    }

    if (!inEvent) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const propFull = trimmed.substring(0, colonIdx)
    const value = trimmed.substring(colonIdx + 1)
    const propKey = propFull.split(';')[0].toUpperCase()

    switch (propKey) {
      case 'SUMMARY':
        currentEvent.title = unescapeIcsText(value)
        break
      case 'DESCRIPTION':
        currentEvent.description = unescapeIcsText(value)
        break
      case 'LOCATION':
        currentEvent.location = unescapeIcsText(value)
        break
      case 'DTSTART':
        currentEvent.startDate = parseIcsDate(value)
        break
      case 'DTEND':
        currentEvent.endDate = parseIcsDate(value)
        break
      case 'UID':
        if (value) currentEvent.id = `cal-${value.replace(/[^a-zA-Z0-9_-]/g, '')}`
        break
    }
  }

  return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

function parseIcsDate(dateStr: string): string {
  try {
    const clean = dateStr.trim()
    if (clean.includes('T')) {
      const year = parseInt(clean.substring(0, 4), 10)
      const month = parseInt(clean.substring(4, 6), 10) - 1
      const day = parseInt(clean.substring(6, 8), 10)
      const tIdx = clean.indexOf('T')
      const hour = parseInt(clean.substring(tIdx + 1, tIdx + 3), 10) || 0
      const minute = parseInt(clean.substring(tIdx + 3, tIdx + 5), 10) || 0
      const second = parseInt(clean.substring(tIdx + 5, tIdx + 7), 10) || 0

      if (clean.endsWith('Z')) {
        return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString()
      }
      return new Date(year, month, day, hour, minute, second).toISOString()
    }

    if (clean.length === 8) {
      const year = parseInt(clean.substring(0, 4), 10)
      const month = parseInt(clean.substring(4, 6), 10) - 1
      const day = parseInt(clean.substring(6, 8), 10)
      return new Date(year, month, day, 23, 59, 0).toISOString()
    }

    const fallback = new Date(clean)
    if (!isNaN(fallback.getTime())) return fallback.toISOString()
  } catch {
    // ignore
  }
  return new Date().toISOString()
}

function unescapeIcsText(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

export function detectEventType(title: string, desc = ''): EventType {
  const combined = (title + ' ' + desc).toLowerCase()
  if (combined.includes('exam') || combined.includes('midterm') || combined.includes('final') || combined.includes('quiz') || combined.includes('test')) {
    return 'EXAM'
  }
  if (combined.includes('milestone') || combined.includes('phase') || combined.includes('sprint') || combined.includes('defense') || combined.includes('demo')) {
    return 'MILESTONE'
  }
  if (combined.includes('lab') || combined.includes('practical') || combined.includes('workshop')) {
    return 'LAB'
  }
  if (combined.includes('study') || combined.includes('review') || combined.includes('office hour')) {
    return 'STUDY_SESSION'
  }
  if (combined.includes('hw') || combined.includes('homework') || combined.includes('assignment') || combined.includes('problem set')) {
    return 'ASSIGNMENT'
  }
  if (combined.includes('lecture') || combined.includes('class') || combined.includes('recitation')) {
    return 'LECTURE'
  }
  return 'OTHER'
}

export function detectCourseCode(title: string): string | undefined {
  const match = title.match(/\b([A-Z]{2,5}\s?\d{3,4})\b/i)
  if (match && match[1]) {
    return match[1].replace(/\s+/g, '').toUpperCase()
  }
  return undefined
}

export function filterNext7DaysEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 3600 * 1000)

  return events.filter((ev) => {
    const evTime = new Date(ev.startDate).getTime()
    return evTime >= now.getTime() - 12 * 3600 * 1000 && evTime <= sevenDaysFromNow.getTime()
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

export function convertEventToDeliverable(
  event: CalendarEvent,
  projectId: string,
  ownerName: string
): Deliverable {
  const officialDueDate = event.startDate
  const internalBufferDeadline = computeDefaultBufferDate(officialDueDate, 72)

  return {
    id: `del-cal-${Date.now()}`,
    projectId,
    taskName: event.title,
    milestonePhase: event.type === 'EXAM' ? 'Final Examination' : 'Course Deliverable',
    ownerName,
    internalBufferDeadline,
    officialDueDate,
    peerReviewer: '',
    status: 'NOT_STARTED',
    artifactUrl: '',
    notes: event.description || `Imported from academic schedule (${event.courseCode || 'Course'})`,
  }
}

export function getCalendarDaysForMonth(year: number, month: number): CalendarDayCell[] {
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Week starts on Monday (0=Mon, 6=Sun)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1
  if (startingDayOfWeek === -1) startingDayOfWeek = 6

  const days: CalendarDayCell[] = []
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Padding days from previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      date: d,
      dateString,
      dayNumber: prevMonthLastDay - i,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
    })
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i)
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    days.push({
      date: d,
      dateString,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
    })
  }

  // Padding days for next month to complete full grid
  const remainingCells = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i)
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      date: d,
      dateString,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
    })
  }

  return days
}

export function getWeekDays(referenceDate: Date): CalendarDayCell[] {
  const ref = new Date(referenceDate)
  let dayOfWeek = ref.getDay() - 1 // 0=Mon, 6=Sun
  if (dayOfWeek === -1) dayOfWeek = 6

  const monday = new Date(ref)
  monday.setDate(ref.getDate() - dayOfWeek)
  monday.setHours(0, 0, 0, 0)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const week: CalendarDayCell[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    week.push({
      date: d,
      dateString,
      dayNumber: d.getDate(),
      isCurrentMonth: true,
      isToday: dateString === todayStr,
    })
  }

  return week
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()

  return events.filter((ev) => {
    const evDate = new Date(ev.startDate)
    return evDate.getFullYear() === y && evDate.getMonth() === m && evDate.getDate() === d
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

export function formatTimeShort(dateIso: string): string {
  try {
    const d = new Date(dateIso)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch {
    return ''
  }
}

// Generate realistic weekly timetable relative to current Monday
function makeDate(daysFromNow: number, hour: number, minute: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const SAMPLE_CALENDAR_EVENTS: CalendarEvent[] = [
  // Recurring Lectures & Labs (Weekly Class Schedule)
  {
    id: 'cal-lec-dsa-1',
    title: 'DSA201: Data Structures Lecture',
    courseCode: 'DSA201',
    startDate: makeDate(0, 9, 0),
    endDate: makeDate(0, 11, 30),
    type: 'LECTURE',
    location: 'Science Hall 101',
    description: 'Graph search algorithms, Dijkstra, and Topological Sort.',
  },
  {
    id: 'cal-lec-math-1',
    title: 'MATH204: Probability Theory Lecture',
    courseCode: 'MATH204',
    startDate: makeDate(0, 13, 30),
    endDate: makeDate(0, 15, 30),
    type: 'LECTURE',
    location: 'Math Building Room 302',
    description: 'Continuous random variables and joint distributions.',
  },
  {
    id: 'cal-lab-pdm-1',
    title: 'PDM102: Python Data Manipulation Lab',
    courseCode: 'PDM102',
    startDate: makeDate(1, 9, 30),
    endDate: makeDate(1, 12, 0),
    type: 'LAB',
    location: 'Computing Lab 4',
    description: 'Hands-on Polars DataFrame transformations and benchmarks.',
  },
  {
    id: 'cal-lec-dbms-1',
    title: 'DBMS301: Database Management Lecture',
    courseCode: 'DBMS301',
    startDate: makeDate(1, 14, 0),
    endDate: makeDate(1, 16, 30),
    type: 'LECTURE',
    location: 'Hall B Room 205',
    description: 'B-Tree indexing and query optimization.',
  },
  {
    id: 'cal-lec-dsa-2',
    title: 'DSA201: Algorithmic Problem Solving',
    courseCode: 'DSA201',
    startDate: makeDate(2, 9, 0),
    endDate: makeDate(2, 11, 30),
    type: 'LECTURE',
    location: 'Science Hall 101',
    description: 'AVL Trees vs Red-Black Trees memory overhead analysis.',
  },
  {
    id: 'cal-study-ds',
    title: 'DS Study Hall & Group Discussion',
    courseCode: 'DSA201',
    startDate: makeDate(2, 15, 0),
    endDate: makeDate(2, 17, 0),
    type: 'STUDY_SESSION',
    location: 'Main Library 3F Pod B',
    description: 'Peer code review and benchmark debugging.',
  },
  {
    id: 'cal-lab-pdm-2',
    title: 'PDM102: Data Ingestion Lab Session',
    courseCode: 'PDM102',
    startDate: makeDate(3, 10, 0),
    endDate: makeDate(3, 12, 30),
    type: 'LAB',
    location: 'Computing Lab 4',
    description: 'Streaming parquet ingestion with lazy evaluation.',
  },
  {
    id: 'cal-lec-dbms-2',
    title: 'DBMS301: Transaction Processing & ACID',
    courseCode: 'DBMS301',
    startDate: makeDate(3, 14, 0),
    endDate: makeDate(3, 16, 30),
    type: 'LECTURE',
    location: 'Hall B Room 205',
    description: 'Two-phase locking and isolation levels.',
  },
  {
    id: 'cal-lab-math-1',
    title: 'MATH204: Statistical Modeling in Python',
    courseCode: 'MATH204',
    startDate: makeDate(4, 10, 0),
    endDate: makeDate(4, 12, 0),
    type: 'LAB',
    location: 'Computing Lab 2',
    description: 'Maximum Likelihood estimation using SciPy.',
  },
  {
    id: 'cal-sprint-dsa',
    title: 'DSA201 Team Sprint & Git Code Review',
    courseCode: 'DSA201',
    startDate: makeDate(4, 14, 0),
    endDate: makeDate(4, 17, 0),
    type: 'MILESTONE',
    location: 'Collab Room 3',
    description: 'Weekly team sync on Buffer Table milestones.',
  },

  // Deadlines & Exams
  {
    id: 'cal-pdm-hw',
    title: 'PDM102 Assignment 3: Polars Vectorization (Official Deadline)',
    courseCode: 'PDM102',
    startDate: makeDate(2, 23, 59),
    type: 'ASSIGNMENT',
    location: 'Online Canvas Portal',
    description: 'Submit Jupyter Notebook and performance benchmark comparison.',
  },
  {
    id: 'cal-dsa-midterm',
    title: 'DSA201 Midterm Examination',
    courseCode: 'DSA201',
    startDate: makeDate(4, 13, 0),
    endDate: makeDate(4, 15, 30),
    type: 'EXAM',
    location: 'Hall C - Hall of Science',
    description: 'Covers balanced trees (AVL, Red-Black), Heaps, and Graph Search algorithms.',
  },
  {
    id: 'cal-math-quiz',
    title: 'MATH204 Probability Distributions Quiz',
    courseCode: 'MATH204',
    startDate: makeDate(6, 11, 0),
    type: 'EXAM',
    location: 'Room 302',
    description: 'Normal, Poisson, and Binomial distributions and Maximum Likelihood Estimation.',
  },
  {
    id: 'cal-dbms-demo',
    title: 'DBMS301 Project Phase 1 Schema Review',
    courseCode: 'DBMS301',
    startDate: makeDate(5, 14, 0),
    type: 'MILESTONE',
    location: 'Lab Room B',
    description: 'Relational schema normalization (3NF/BCNF) and query execution plans.',
  },
]

/**
 * Detect time collisions and exam clustering in calendar events.
 */
export function detectScheduleConflicts(events: CalendarEvent[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const seenPairKeys = new Set<string>()

  // Group events by day string YYYY-MM-DD
  const eventsByDay = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    if (!ev.startDate) continue
    const dayStr = ev.startDate.substring(0, 10)
    if (!eventsByDay.has(dayStr)) {
      eventsByDay.set(dayStr, [])
    }
    eventsByDay.get(dayStr)!.push(ev)
  }

  for (const [dayStr, dayEvents] of eventsByDay.entries()) {
    if (dayEvents.length < 2) continue

    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const evA = dayEvents[i]
        const evB = dayEvents[j]
        const pairKey = [evA.id, evB.id].sort().join('::')
        if (seenPairKeys.has(pairKey)) continue

        // Check 1: Exam crunch (2 exams on same day)
        if (evA.type === 'EXAM' && evB.type === 'EXAM') {
          seenPairKeys.add(pairKey)
          conflicts.push({
            id: `conflict-exam-${pairKey}`,
            eventA: evA,
            eventB: evB,
            date: dayStr,
            conflictType: 'EXAM_CRUNCH',
            message: `Exam Crunch: Multiple exams scheduled on ${dayStr} ("${evA.title}" & "${evB.title}")`,
          })
          continue
        }

        // Check 2: Time overlap if both have start and end dates
        const startA = new Date(evA.startDate).getTime()
        const endA = evA.endDate ? new Date(evA.endDate).getTime() : startA + 60 * 60 * 1000
        const startB = new Date(evB.startDate).getTime()
        const endB = evB.endDate ? new Date(evB.endDate).getTime() : startB + 60 * 60 * 1000

        if (startA < endB && startB < endA) {
          seenPairKeys.add(pairKey)
          conflicts.push({
            id: `conflict-overlap-${pairKey}`,
            eventA: evA,
            eventB: evB,
            date: dayStr,
            conflictType: 'OVERLAP',
            message: `Schedule Overlap: "${evA.title}" overlaps with "${evB.title}" on ${dayStr}`,
          })
        }
      }
    }
  }

  return conflicts
}

/**
 * Detect days where multiple deliverables have internal 72-hour safety buffers colliding.
 */
export function detectBufferOverlaps(deliverables: Deliverable[]): BufferCongestion[] {
  const byBufferDay = new Map<string, Deliverable[]>()

  for (const del of deliverables) {
    if (del.status === 'APPROVED') continue // Approved items no longer cause stress
    const dayStr = del.internalBufferDeadline ? del.internalBufferDeadline.substring(0, 10) : ''
    if (!dayStr) continue

    if (!byBufferDay.has(dayStr)) {
      byBufferDay.set(dayStr, [])
    }
    byBufferDay.get(dayStr)!.push(del)
  }

  const results: BufferCongestion[] = []
  for (const [dayStr, dels] of byBufferDay.entries()) {
    if (dels.length >= 2) {
      results.push({
        date: dayStr,
        count: dels.length,
        deliverables: dels,
        message: `Safety Buffer Crunch: ${dels.length} internal milestone deadlines converge on ${dayStr}.`,
      })
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date))
}

