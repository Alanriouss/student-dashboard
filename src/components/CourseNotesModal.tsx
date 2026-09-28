import React, { useState, useEffect } from 'react'
import type { Course } from '../types'
import {
  X,
  Save,
  Download,
  Copy,
  Check,
  BookOpen,
  Code,
  FileText,
  Sparkles,
} from 'lucide-react'

interface CourseNotesModalProps {
  course: Course | null
  isOpen: boolean
  onClose: () => void
  onSaveNotes: (courseId: string, notes: string) => void
}

const FORMULA_SNIPPETS = [
  {
    name: 'Bayes Theorem',
    snippet: '$$P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}$$',
  },
  {
    name: 'Gradient Descent',
    snippet: '$$\\theta := \\theta - \\alpha \\nabla J(\\theta)$$',
  },
  {
    name: 'Mean Squared Error (MSE)',
    snippet: '$$MSE = \\frac{1}{n} \\sum_{i=1}^{n} (y_i - \\hat{y}_i)^2$$',
  },
  {
    name: 'Big-O Quick Table',
    snippet: `| Algorithm | Time (Avg) | Time (Worst) | Space |
| :--- | :--- | :--- | :--- |
| QuickSort | O(n log n) | O(n^2) | O(log n) |
| MergeSort | O(n log n) | O(n log n) | O(n) |
| Binary Search | O(log n) | O(log n) | O(1) |`,
  },
  {
    name: 'SQL Window Function',
    snippet: `\`\`\`sql
SELECT employee_id, department, salary,
       RANK() OVER (PARTITION BY department ORDER BY salary DESC) as rank
FROM employees;
\`\`\``,
  },
]

export const CourseNotesModal: React.FC<CourseNotesModalProps> = ({
  course,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState(() => course?.notes || '')
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT')
  const [copied, setCopied] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    let isCancelled = false
    if (course) {
      queueMicrotask(() => {
        if (!isCancelled) setNotes(course.notes || '')
      })
    }
    return () => {
      isCancelled = true
    }
  }, [course])

  if (!isOpen || !course) return null

  const handleSave = () => {
    onSaveNotes(course.id, notes)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(notes)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${course.code}_study_notes.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const insertSnippet = (snippet: string) => {
    setNotes((prev) => (prev ? `${prev}\n\n${snippet}` : snippet))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#1B2220] border border-[#2D3834] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#2D3834] flex items-center justify-between bg-[#131716]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5B8266]/15 border border-[#5B8266]/30 text-[#5B8266]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1B2220] text-[#5B8266] border border-[#2D3834] font-semibold">
                  {course.code}
                </span>
                <span className="text-xs text-[#8C9E96] font-mono">{course.credits} Credits</span>
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-[#E0E6E4] mt-0.5">
                {course.title} &mdash; Study Notes &amp; Formulas
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 py-2 border-b border-[#2D3834] bg-[#171E1C] flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Editor / Preview Switcher */}
          <div className="flex items-center gap-1 bg-[#131716] p-0.5 rounded-lg border border-[#2D3834]">
            <button
              onClick={() => setActiveTab('EDIT')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors font-medium ${
                activeTab === 'EDIT'
                  ? 'bg-[#5B8266] text-[#E0E6E4]'
                  : 'text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Markdown Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('PREVIEW')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors font-medium ${
                activeTab === 'PREVIEW'
                  ? 'bg-[#5B8266] text-[#E0E6E4]'
                  : 'text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Quick Snippets & File Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#5B8266]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>
          </div>
        </div>

        {/* Quick Insert Snippet Chips (in Edit Mode) */}
        {activeTab === 'EDIT' && (
          <div className="px-4 py-2 bg-[#131716] border-b border-[#2D3834] flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[#8C9E96] font-medium flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-[#5B8266]" />
              Templates:
            </span>
            {FORMULA_SNIPPETS.map((snip) => (
              <button
                key={snip.name}
                onClick={() => insertSnippet(snip.snippet)}
                className="px-2 py-0.5 rounded bg-[#1B2220] hover:bg-[#2A3532] text-[#648381] hover:text-[#E0E6E4] border border-[#2D3834] shrink-0 transition-colors"
              >
                + {snip.name}
              </button>
            ))}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'EDIT' ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`# ${course.code}: ${course.title} - Study Notes\n\n- Key definitions...\n- Formulas & Derivations...\n- Exam preparation checklist...`}
              rows={16}
              className="w-full h-full min-h-[300px] p-3 rounded-xl bg-[#131716] border border-[#2D3834] text-xs sm:text-sm text-[#E0E6E4] font-mono focus:border-[#5B8266] focus:outline-none resize-none leading-relaxed"
            />
          ) : (
            <div className="p-4 rounded-xl bg-[#131716] border border-[#2D3834] min-h-[300px] prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed text-[#E0E6E4]">
              {notes.trim() ? (
                <div className="space-y-3 font-sans whitespace-pre-wrap font-mono text-xs">
                  {notes}
                </div>
              ) : (
                <div className="text-center py-12 text-[#8C9E96]">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No notes written yet. Switch to the editor to add formulas and study points.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2D3834] bg-[#131716] flex items-center justify-between">
          <div className="text-xs text-[#8C9E96]">
            {savedSuccess ? (
              <span className="text-[#5B8266] flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Notes saved to local database!
              </span>
            ) : (
              <span>Stored with course data in LocalStorage</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-semibold text-[#E0E6E4] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
