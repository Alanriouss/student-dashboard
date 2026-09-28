import React, { useState } from 'react'
import type { CalendarEvent, Course, EventType } from '../types'
import { X, Calendar as CalendarIcon, MapPin, AlignLeft } from 'lucide-react'

interface CalendarEventModalProps {
  event?: CalendarEvent | null
  initialDate?: Date | null
  courses: Course[]
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => void
}

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  event,
  initialDate,
  courses,
  isOpen,
  onClose,
  onSave,
}) => {
  const getDefaultDateStr = (date?: Date | null, hour = 9, minute = 0) => {
    const d = date ? new Date(date) : new Date()
    d.setHours(hour, minute, 0, 0)
    return d.toISOString().slice(0, 16)
  }

  const [title, setTitle] = useState(event?.title ?? '')
  const [courseCode, setCourseCode] = useState(event?.courseCode ?? courses[0]?.code ?? '')
  const [type, setType] = useState<EventType>(event?.type ?? 'LECTURE')
  const [startDate, setStartDate] = useState(event ? new Date(event.startDate).toISOString().slice(0, 16) : getDefaultDateStr(initialDate, 9, 0))
  const [endDate, setEndDate] = useState(event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : getDefaultDateStr(initialDate, 11, 30))
  const [location, setLocation] = useState(event?.location ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Event title is required.')
      return
    }

    onSave({
      ...(event ? { id: event.id } : {}),
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase() || undefined,
      type,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      isBufferConverted: event?.isBufferConverted ?? false,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E0E6E4]">
                {event ? 'Edit Academic Schedule Item' : 'Add Class / Schedule Event'}
              </h3>
              <p className="text-xs text-[#8C9E96]">
                Lectures, labs, study halls, examinations, and project syncs
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

        {error && (
          <div className="my-3 p-3 rounded-lg bg-[#2A1717] border border-[#A36262]/40 text-xs text-[#E0E6E4]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium">Session / Event Title</label>
            <input
              type="text"
              placeholder="e.g. DSA201: Data Structures Lecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Related Course</label>
              <select
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none font-mono"
              >
                <option value="">General / Extracurricular</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Schedule Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none font-medium"
              >
                <option value="LECTURE">LECTURE (Class Session)</option>
                <option value="LAB">LAB (Practical / Workshop)</option>
                <option value="STUDY_SESSION">STUDY SESSION (Review)</option>
                <option value="EXAM">EXAM (Midterm / Final / Quiz)</option>
                <option value="ASSIGNMENT">ASSIGNMENT (Homework / Lab Due)</option>
                <option value="MILESTONE">MILESTONE (Sprint / Demo)</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Start Date &amp; Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">End Date &amp; Time (Optional)</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#648381]" />
              <span>Location / Room / Link</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Science Hall 101, Computing Lab 4, or Zoom"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-[#648381]" />
              <span>Description / Topics Covered</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Topic overview, reading assignments, chapter review..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D3834]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-[#E0E6E4] font-medium transition-colors"
            >
              {event ? 'Update Schedule Item' : 'Add to Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
