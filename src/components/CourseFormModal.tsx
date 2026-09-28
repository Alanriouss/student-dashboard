import React, { useState } from 'react'
import type { Course, LetterGrade } from '../types'
import { X, BookOpen, AlertCircle } from 'lucide-react'

interface CourseFormModalProps {
  course?: Course | null
  isOpen: boolean
  onClose: () => void
  onSave: (courseData: Omit<Course, 'id'> & { id?: string }) => void
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  course,
  isOpen,
  onClose,
  onSave,
}) => {
  const [code, setCode] = useState(course?.code ?? '')
  const [title, setTitle] = useState(course?.title ?? '')
  const [credits, setCredits] = useState<number>(course?.credits ?? 3)
  const [weightInClass, setWeightInClass] = useState<number>(course?.weightInClass ?? 0.20)
  const [weightMidterm, setWeightMidterm] = useState<number>(course?.weightMidterm ?? 0.30)
  const [weightFinal, setWeightFinal] = useState<number>(course?.weightFinal ?? 0.50)
  const [scoreInClass, setScoreInClass] = useState<string>(course?.scoreInClass !== null && course?.scoreInClass !== undefined ? String(course.scoreInClass) : '')
  const [scoreMidterm, setScoreMidterm] = useState<string>(course?.scoreMidterm !== null && course?.scoreMidterm !== undefined ? String(course.scoreMidterm) : '')
  const [scoreFinal, setScoreFinal] = useState<string>(course?.scoreFinal !== null && course?.scoreFinal !== undefined ? String(course.scoreFinal) : '')
  const [targetGrade, setTargetGrade] = useState<LetterGrade>(course?.targetGrade ?? 'A')
  const [semester, setSemester] = useState(course?.semester ?? 'Fall 2026')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const weightSum = Math.round((weightInClass + weightMidterm + weightFinal) * 100) / 100

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !title.trim()) {
      setError('Course code and title are required.')
      return
    }

    if (Math.abs(weightSum - 1.0) > 0.001) {
      setError(`Weights must sum to 1.00 (current sum: ${weightSum}).`)
      return
    }

    const inClassNum = scoreInClass.trim() === '' ? null : Number(scoreInClass)
    const midtermNum = scoreMidterm.trim() === '' ? null : Number(scoreMidterm)
    const finalNum = scoreFinal.trim() === '' ? null : Number(scoreFinal)

    if (inClassNum !== null && (isNaN(inClassNum) || inClassNum < 0 || inClassNum > 100)) {
      setError('In-Class score must be between 0 and 100.')
      return
    }
    if (midtermNum !== null && (isNaN(midtermNum) || midtermNum < 0 || midtermNum > 100)) {
      setError('Midterm score must be between 0 and 100.')
      return
    }
    if (finalNum !== null && (isNaN(finalNum) || finalNum < 0 || finalNum > 100)) {
      setError('Final score must be between 0 and 100.')
      return
    }

    onSave({
      ...(course ? { id: course.id } : {}),
      code: code.trim().toUpperCase(),
      title: title.trim(),
      credits,
      weightInClass,
      weightMidterm,
      weightFinal,
      scoreInClass: inClassNum,
      scoreMidterm: midtermNum,
      scoreFinal: finalNum,
      targetGrade,
      semester,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E0E6E4]">
                {course ? 'Edit Course Syllabus & Scores' : 'Add New Academic Course'}
              </h3>
              <p className="text-xs text-[#8C9E96]">Configure credit weighting, component scores, and target grade</p>
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
          <div className="my-3 p-3 rounded-lg bg-[#2A1717] border border-[#A36262]/40 text-xs text-[#E0E6E4] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#A36262] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Course Code</label>
              <input
                type="text"
                placeholder="e.g. DSA201"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[#8C9E96] mb-1 font-medium">Full Course Title</label>
              <input
                type="text"
                placeholder="e.g. Data Structures & Algorithms"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Credits</label>
              <input
                type="number"
                min="1"
                max="10"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Target Grade</label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value as LetterGrade)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
              >
                {(['A+', 'A', 'B+', 'B', 'C', 'D+', 'D'] as LetterGrade[]).map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Semester</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. Fall 2026"
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
              />
            </div>
          </div>

          {/* Syllabus Component Weights */}
          <div className="p-3 rounded-xl bg-[#1B2220] border border-[#2D3834]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-[#E0E6E4]">Syllabus Component Weights</span>
              <span className={`font-mono text-[11px] ${Math.abs(weightSum - 1.0) < 0.001 ? 'text-[#5B9975]' : 'text-[#A36262]'}`}>
                Sum: {weightSum.toFixed(2)} / 1.00
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">In-Class (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={weightInClass}
                  onChange={(e) => setWeightInClass(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">Midterm (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={weightMidterm}
                  onChange={(e) => setWeightMidterm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">Final Exam (0.0 - 1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={weightFinal}
                  onChange={(e) => setWeightFinal(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
            </div>
          </div>

          {/* Current Recorded Scores */}
          <div className="p-3 rounded-xl bg-[#1B2220] border border-[#2D3834]">
            <span className="font-medium text-[#E0E6E4] block mb-2">Recorded Scores (0 - 100 Scale, blank if not taken)</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">In-Class Score</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="e.g. 88"
                  value={scoreInClass}
                  onChange={(e) => setScoreInClass(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">Midterm Score</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="e.g. 82"
                  value={scoreMidterm}
                  onChange={(e) => setScoreMidterm(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">Final Score</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="Pending"
                  value={scoreFinal}
                  onChange={(e) => setScoreFinal(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-center"
                />
              </div>
            </div>
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
              {course ? 'Update Course' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
