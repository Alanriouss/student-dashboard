import React, { useState, useMemo } from 'react'
import type { AppData, Course, Deliverable, CalendarEvent, DiffItem } from '../types'
import { computeTableDiff, mergeSelectedDiffs } from '../utils/syncDiffEngine'
import {
  X,
  Check,
  CheckSquare,
  Square,
  ArrowRight,
  Sheet,
  BookOpen,
  Calendar,
  FileCheck,
} from 'lucide-react'

interface SyncDiffModalProps {
  isOpen: boolean
  onClose: () => void
  localData: AppData
  remoteData: {
    courses?: Course[]
    deliverables?: Deliverable[]
    calendarEvents?: CalendarEvent[]
    lastSynced?: string
  }
  providerName?: string
  onApplyMerge: (mergedData: {
    courses?: Course[]
    deliverables?: Deliverable[]
    calendarEvents?: CalendarEvent[]
  }) => void
}

type TabType = 'deliverables' | 'courses' | 'calendar'

export const SyncDiffModal: React.FC<SyncDiffModalProps> = ({
  isOpen,
  onClose,
  localData,
  remoteData,
  providerName = 'Google Sheets',
  onApplyMerge,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('deliverables')

  // Compute diffs for each collection
  const deliverableDiff = useMemo(() => {
    return computeTableDiff<Deliverable>(
      'Deliverables',
      localData.deliverables,
      remoteData.deliverables || [],
      (d) => d.taskName
    )
  }, [localData.deliverables, remoteData.deliverables])

  const courseDiff = useMemo(() => {
    return computeTableDiff<Course>(
      'Courses',
      localData.courses,
      remoteData.courses || [],
      (c) => `${c.code}: ${c.title}`
    )
  }, [localData.courses, remoteData.courses])

  const calendarDiff = useMemo(() => {
    return computeTableDiff<CalendarEvent>(
      'Calendar Events',
      localData.calendarEvents,
      remoteData.calendarEvents || [],
      (e) => e.title
    )
  }, [localData.calendarEvents, remoteData.calendarEvents])

  // Track checked IDs: initialize with all diff IDs selected by default
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const all = new Set<string>()
    deliverableDiff.items.forEach((d) => all.add(d.id))
    courseDiff.items.forEach((c) => all.add(c.id))
    calendarDiff.items.forEach((e) => all.add(e.id))
    return all
  })

  if (!isOpen) return null

  const currentDiffTable =
    activeTab === 'deliverables'
      ? deliverableDiff
      : activeTab === 'courses'
      ? courseDiff
      : calendarDiff

  const totalDiffCount =
    deliverableDiff.totalChanges + courseDiff.totalChanges + calendarDiff.totalChanges

  const handleToggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllCurrentTab = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      currentDiffTable.items.forEach((item) => next.add(item.id))
      return next
    })
  }

  const handleDeselectAllCurrentTab = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      currentDiffTable.items.forEach((item) => next.delete(item.id))
      return next
    })
  }

  const handleApply = () => {
    // Collect selected diff items for each table
    const selectedDels = deliverableDiff.items.filter((d) => selectedIds.has(d.id))
    const selectedCourses = courseDiff.items.filter((c) => selectedIds.has(c.id))
    const selectedCals = calendarDiff.items.filter((e) => selectedIds.has(e.id))

    const mergedDeliverables =
      selectedDels.length > 0
        ? mergeSelectedDiffs(localData.deliverables, selectedDels)
        : undefined

    const mergedCourses =
      selectedCourses.length > 0
        ? mergeSelectedDiffs(localData.courses, selectedCourses)
        : undefined

    const mergedCalendar =
      selectedCals.length > 0
        ? mergeSelectedDiffs(localData.calendarEvents, selectedCals)
        : undefined

    onApplyMerge({
      deliverables: mergedDeliverables,
      courses: mergedCourses,
      calendarEvents: mergedCalendar,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#1B2220] border border-[#2D3834] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2D3834] flex items-center justify-between bg-[#131716]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#E0E6E4]">
                  Review &amp; Merge {providerName} Updates
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#5B8266]/20 text-[#5B8266] border border-[#5B8266]/30 font-bold">
                  {totalDiffCount} Difference{totalDiffCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-[#8C9E96]">
                Preview changes before merging into your local dashboard to avoid overwriting teammate work
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-[#2D3834] bg-[#171E1C] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#131716] p-0.5 rounded-lg border border-[#2D3834]">
            <button
              onClick={() => setActiveTab('deliverables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'deliverables'
                  ? 'bg-[#5B8266] text-[#E0E6E4]'
                  : 'text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Milestone Deliverables</span>
              {deliverableDiff.totalChanges > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#1B2220] font-mono font-bold text-[#E0E6E4]">
                  {deliverableDiff.totalChanges}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'courses'
                  ? 'bg-[#5B8266] text-[#E0E6E4]'
                  : 'text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Courses &amp; Grades</span>
              {courseDiff.totalChanges > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#1B2220] font-mono font-bold text-[#E0E6E4]">
                  {courseDiff.totalChanges}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-[#5B8266] text-[#E0E6E4]'
                  : 'text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendar</span>
              {calendarDiff.totalChanges > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#1B2220] font-mono font-bold text-[#E0E6E4]">
                  {calendarDiff.totalChanges}
                </span>
              )}
            </button>
          </div>

          {/* Quick Select Controls */}
          {currentDiffTable.items.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleSelectAllCurrentTab}
                className="flex items-center gap-1 text-[#5B8266] hover:underline"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Select All</span>
              </button>
              <span className="text-[#2D3834]">&bull;</span>
              <button
                onClick={handleDeselectAllCurrentTab}
                className="flex items-center gap-1 text-[#8C9E96] hover:text-[#E0E6E4]"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Deselect All</span>
              </button>
            </div>
          )}
        </div>

        {/* Diff Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {currentDiffTable.items.length === 0 ? (
            <div className="text-center py-12 text-[#8C9E96] space-y-2">
              <Check className="w-8 h-8 mx-auto text-[#5B8266] opacity-70" />
              <p className="text-sm font-medium text-[#E0E6E4]">Up to Date!</p>
              <p className="text-xs">
                No differences found between your local {currentDiffTable.tableName} and the remote {providerName}.
              </p>
            </div>
          ) : (
            currentDiffTable.items.map((diff: DiffItem<any>) => {
              const isChecked = selectedIds.has(diff.id)
              return (
                <div
                  key={diff.id}
                  onClick={() => handleToggleId(diff.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#18261F] border-[#5B8266]/50 shadow-xs'
                      : 'bg-[#131716] border-[#2D3834] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-[#5B8266]">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#5B8266]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8C9E96]" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              diff.status === 'NEW'
                                ? 'bg-[#5B9975]/20 text-[#5B9975] border border-[#5B9975]/30'
                                : 'bg-[#997A5B]/20 text-[#997A5B] border border-[#997A5B]/30'
                            }`}
                          >
                            {diff.status === 'NEW' ? '+ NEW IN SHEET' : 'MODIFIED'}
                          </span>
                          <span className="text-xs font-semibold text-[#E0E6E4]">
                            {diff.description}
                          </span>
                        </div>

                        {/* Field-level Diffs */}
                        {diff.status === 'MODIFIED' && diff.changedFields.length > 0 && (
                          <div className="mt-2 space-y-1 text-[11px] font-mono">
                            {diff.changedFields.map((fieldDiff) => (
                              <div
                                key={fieldDiff.field}
                                className="flex items-center gap-2 bg-[#131716]/60 p-1.5 rounded border border-[#2D3834]"
                              >
                                <span className="text-[#8C9E96] font-medium min-w-[80px]">
                                  {fieldDiff.field}:
                                </span>
                                <span className="line-through text-[#A36262]">
                                  {String(fieldDiff.oldValue ?? 'None')}
                                </span>
                                <ArrowRight className="w-3 h-3 text-[#8C9E96]" />
                                <span className="text-[#5B9975] font-bold">
                                  {String(fieldDiff.newValue ?? 'None')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {diff.status === 'NEW' && diff.remoteItem && (
                          <p className="mt-1 text-xs text-[#8C9E96]">
                            This record was added in the remote sheet and does not exist locally yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2D3834] bg-[#131716] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-[#8C9E96]">
            <span>
              {selectedIds.size} of {totalDiffCount} changes selected to merge
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-semibold text-[#E0E6E4] disabled:opacity-40 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Merge Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
