import React from 'react'
import type { CalendarEvent, Course, Deliverable } from '../types'
import { calculateSemesterGPAs, getGradeDetails } from '../utils/gradeEngine'
import { getBufferUrgency } from '../utils/bufferEngine'
import { Award, BookOpen, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

interface KpiStripProps {
  courses: Course[]
  deliverables: Deliverable[]
  calendarEvents?: CalendarEvent[]
  onSelectBufferTab: () => void
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  courses,
  deliverables,
  calendarEvents = [],
  onSelectBufferTab,
}) => {
  const gpaMetrics = calculateSemesterGPAs(courses)
  const currentGradeDetails = getGradeDetails(gpaMetrics.gpa100)

  // Count deliverables approaching or breaching buffer (<72h or overdue)
  const urgentDeliverables = deliverables.filter(d => {
    const { isApproachingBuffer, urgency } = getBufferUrgency(d)
    return isApproachingBuffer || urgency === 'OVERDUE'
  })

  const overdueCount = deliverables.filter(d => getBufferUrgency(d).urgency === 'OVERDUE').length

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {/* GPA 4.0 Scale */}
      <div className="p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] relative overflow-hidden group hover:border-[#3A4742] transition-colors">
        <div className="flex items-center justify-between text-[#8C9E96] text-xs font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-[#5B8266]" />
            Cumulative GPA (4.0 Scale)
          </span>
          <span className="font-mono text-[11px] text-[#5B8266]">Official Scale</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold tracking-tight text-[#E0E6E4]">
            {gpaMetrics.gpa4.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-[#8C9E96]">/ 4.00</span>
          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-[#5B8266]/20 border border-[#5B8266]/40 text-[#E0E6E4] font-medium">
            {currentGradeDetails.letterGrade}
          </span>
        </div>
        <p className="text-[11px] text-[#8C9E96] mt-1.5 truncate">
          Rank: <span className="text-[#E0E6E4]">{currentGradeDetails.classification}</span>
        </p>
      </div>

      {/* 100-Point Weighted Composite */}
      <div className="p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] relative overflow-hidden group hover:border-[#3A4742] transition-colors">
        <div className="flex items-center justify-between text-[#8C9E96] text-xs font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#648381]" />
            Weighted 100-Point Average
          </span>
          <span className="font-mono text-[11px] text-[#8C9E96]">{gpaMetrics.completedCourses}/{gpaMetrics.totalCourses} Graded</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold tracking-tight text-[#E0E6E4]">
            {gpaMetrics.gpa100.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-[#8C9E96]">/ 100.0</span>
        </div>
        <p className="text-[11px] text-[#8C9E96] mt-1.5 flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-[#5B9975]" />
          <span>Status: <strong className="text-[#5B9975]">{currentGradeDetails.status}</strong></span>
        </p>
      </div>

      {/* Credit Load & Academic Standing */}
      <div className="p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] relative overflow-hidden group hover:border-[#3A4742] transition-colors">
        <div className="flex items-center justify-between text-[#8C9E96] text-xs font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#648381]" />
            Semester Credit Load
          </span>
          <span className="text-[11px] text-[#5B8266] font-mono">Sophomore Fall</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-bold tracking-tight text-[#E0E6E4]">
            {gpaMetrics.totalCredits}
          </span>
          <span className="text-xs text-[#8C9E96]">Total Credits</span>
        </div>
        <p className="text-[11px] text-[#8C9E96] mt-1.5">
          {gpaMetrics.earnedCredits} Credits In Good Standing ({courses.length} courses &bull; {calendarEvents.filter(e => e.type === 'EXAM').length} Exams)
        </p>
      </div>

      {/* Buffer Safety Alert (72-Hour Internal Safety Buffer) */}
      <div
        onClick={onSelectBufferTab}
        className={`p-4 rounded-xl border relative overflow-hidden cursor-pointer transition-all ${
          urgentDeliverables.length > 0
            ? 'bg-[#1D1B17] border-[#997A5B]/40 hover:border-[#997A5B] shadow-md shadow-[#131716]'
            : 'bg-[#1B2220] border-[#2D3834] hover:border-[#3A4742]'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-medium mb-1">
          <span className="flex items-center gap-1.5 text-[#E0E6E4]">
            <AlertTriangle className={`w-3.5 h-3.5 ${urgentDeliverables.length > 0 ? 'text-[#997A5B]' : 'text-[#8C9E96]'}`} />
            72h Buffer Watchlist
          </span>
          {urgentDeliverables.length > 0 ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#997A5B]/20 text-[#B89674] border border-[#997A5B]/40 animate-pulse">
              ACTION REQUIRED
            </span>
          ) : (
            <span className="text-[10px] font-mono text-[#5B9975]">ALL CLEAR</span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-mono font-bold tracking-tight ${urgentDeliverables.length > 0 ? 'text-[#B89674]' : 'text-[#E0E6E4]'}`}>
            {urgentDeliverables.length}
          </span>
          <span className="text-xs text-[#8C9E96]">Deliverables Due Soon</span>
        </div>
        <p className="text-[11px] text-[#8C9E96] mt-1.5 flex items-center justify-between">
          <span>{overdueCount > 0 ? `${overdueCount} breached internal buffer` : 'Zero buffer breaches'}</span>
          <span className="text-xs text-[#648381] group-hover:underline">View Buffer &rarr;</span>
        </p>
      </div>
    </div>
  )
}
