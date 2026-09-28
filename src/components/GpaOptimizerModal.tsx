import React, { useState } from 'react'
import type { Course, LetterGrade } from '../types'
import { optimizeSemesterGpa } from '../utils/gpaOptimizer'
import { X, Award, Target, CheckCircle2, AlertTriangle, ArrowRight, Zap } from 'lucide-react'

interface GpaOptimizerModalProps {
  courses: Course[]
  isOpen: boolean
  onClose: () => void
  onApplyPlan: (updatedCourses: Course[]) => void
}

export const GpaOptimizerModal: React.FC<GpaOptimizerModalProps> = ({
  courses,
  isOpen,
  onClose,
  onApplyPlan,
}) => {
  const [targetGpa, setTargetGpa] = useState<number>(3.75)

  if (!isOpen) return null

  const plan = optimizeSemesterGpa(courses, targetGpa)

  const handleApply = () => {
    const updated = courses.map((c) => {
      const target = plan.courseTargets.find((t) => t.courseId === c.id)
      if (target) {
        return {
          ...c,
          targetGrade: target.targetGrade as LetterGrade,
        }
      }
      return c
    })
    onApplyPlan(updated)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="optimizer-modal-title"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="optimizer-modal-title" className="text-base font-semibold text-[#E0E6E4]">
                  Semester Target GPA Macro Optimizer
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B8266]/20 text-[#5B8266] border border-[#5B8266]/30 font-mono">
                  Phase 2 Engine
                </span>
              </div>
              <p className="text-xs text-[#8C9E96]">
                Credit-weighted combinatorial solver balancing final exam burden across all {courses.length} courses
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

        {/* Target GPA Slider Controller */}
        <div className="my-5 p-4 rounded-xl bg-[#1B2220] border border-[#2D3834] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-[#E0E6E4] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#5B8266]" />
              Desired Semester Cumulative Target GPA (4.0 Scale)
            </span>
            <span className="font-mono text-xl font-bold text-[#5B8266]">
              {targetGpa.toFixed(2)} / 4.00
            </span>
          </div>

          <input
            type="range"
            min="2.50"
            max="4.00"
            step="0.05"
            value={targetGpa}
            onChange={(e) => setTargetGpa(Number(e.target.value))}
            className="w-full h-2.5 bg-[#131716] rounded-lg appearance-none cursor-pointer accent-[#5B8266]"
          />

          <div className="flex justify-between text-[11px] text-[#8C9E96] font-mono">
            <span>2.50 (Good)</span>
            <span>3.00 (Khá)</span>
            <span>3.50 (Giỏi)</span>
            <span>3.70 (Magna)</span>
            <span>4.00 (Perfect)</span>
          </div>
        </div>

        {/* Plan Feasibility Summary */}
        <div className={`p-4 rounded-xl border mb-5 transition-colors ${
          plan.difficulty === 'COMFORTABLE'
            ? 'bg-[#18261F] border-[#5B9975]/40 text-[#E0E6E4]'
            : plan.difficulty === 'MODERATE'
            ? 'bg-[#1C231F] border-[#5B8266]/40 text-[#E0E6E4]'
            : plan.difficulty === 'INTENSIVE'
            ? 'bg-[#261E16] border-[#997A5B]/40 text-[#E0E6E4]'
            : 'bg-[#261919] border-[#A36262]/40 text-[#E0E6E4]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#5B8266]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#8C9E96]">
                Effort Feasibility Rating
              </span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
              plan.difficulty === 'COMFORTABLE'
                ? 'bg-[#5B9975]/20 text-[#5B9975] border-[#5B9975]/40'
                : plan.difficulty === 'MODERATE'
                ? 'bg-[#5B8266]/20 text-[#5B8266] border-[#5B8266]/40'
                : plan.difficulty === 'INTENSIVE'
                ? 'bg-[#997A5B]/20 text-[#B89674] border-[#997A5B]/40'
                : 'bg-[#A36262]/20 text-[#A36262] border-[#A36262]/40'
            }`}>
              {plan.difficulty}
            </span>
          </div>

          <p className="text-xs text-[#E0E6E4] mb-3">
            {plan.summaryMessage}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2D3834]/60 text-xs font-mono text-[#8C9E96]">
            <div>
              <span className="text-[10px] block">Projected GPA</span>
              <strong className="text-[#E0E6E4] text-sm">{plan.achievedGpa.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-[10px] block">Average Exam Target</span>
              <strong className="text-[#E0E6E4] text-sm">{plan.averageRequiredFinal.toFixed(1)} / 100</strong>
            </div>
            <div>
              <span className="text-[10px] block">Max Stress Point</span>
              <strong className="text-[#B89674] text-sm">
                {plan.highestExamPressure.courseCode}: {plan.highestExamPressure.score.toFixed(1)}
              </strong>
            </div>
          </div>
        </div>

        {/* Per-Course Target Distribution Table */}
        <div className="space-y-2 mb-5">
          <span className="text-xs font-semibold text-[#E0E6E4] uppercase tracking-wider font-mono block">
            Optimal Course Target Grade Allocations
          </span>

          <div className="rounded-xl border border-[#2D3834] bg-[#131716] overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2D3834] text-[#8C9E96] text-[11px] bg-[#171E1C]">
                  <th className="py-2 px-3">Course</th>
                  <th className="py-2 px-2">Credits</th>
                  <th className="py-2 px-2">Target Grade</th>
                  <th className="py-2 px-2">4.0 Pts</th>
                  <th className="py-2 px-3 text-right">Required Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3834]/50">
                {plan.courseTargets.map((item) => (
                  <tr key={item.courseId} className="hover:bg-[#1B2220]/50">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#E0E6E4]">{item.courseCode}</div>
                      <div className="text-[10px] text-[#8C9E96] truncate max-w-[180px]">{item.title}</div>
                    </td>
                    <td className="py-2.5 px-2 text-[#8C9E96]">{item.credits}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-[#1B2220] border border-[#2D3834] text-[#5B8266] font-bold">
                        {item.targetGrade}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-[#E0E6E4]">{item.gpaPoint.toFixed(1)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {item.isSecured ? (
                        <span className="text-[#5B9975] flex items-center justify-end gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Secured
                        </span>
                      ) : !item.isAttainable ? (
                        <span className="text-[#A36262] flex items-center justify-end gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> &gt;100
                        </span>
                      ) : (
                        <span className="font-semibold text-[#E0E6E4]">
                          {item.requiredFinalScore.toFixed(1)} <span className="text-[10px] text-[#8C9E96] font-normal">/ 100</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#2D3834]">
          <div className="text-[11px] text-[#8C9E96]">
            Weights: 0.20 In-Class, 0.30 Midterm, 0.50 Final
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!plan.isFeasible}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-md transition-colors disabled:opacity-50"
            >
              <span>Apply Optimized Plan to Courses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
