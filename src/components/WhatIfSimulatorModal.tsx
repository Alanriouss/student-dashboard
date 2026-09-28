import React, { useState } from 'react'
import type { Course, LetterGrade } from '../types'
import { solveTargetFinalScore, TARGET_GRADE_THRESHOLDS } from '../utils/gradeEngine'
import { X, Sliders, CheckCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'

interface WhatIfSimulatorModalProps {
  course: Course
  isOpen: boolean
  onClose: () => void
  onApplyScores: (inClass: number, midterm: number, targetGrade: LetterGrade) => void
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  course,
  isOpen,
  onClose,
  onApplyScores,
}) => {
  const [simInClass, setSimInClass] = useState<number>(course.scoreInClass ?? 80)
  const [simMidterm, setSimMidterm] = useState<number>(course.scoreMidterm ?? 75)
  const [simTargetGrade, setSimTargetGrade] = useState<LetterGrade>(course.targetGrade)

  if (!isOpen) return null

  const solverResult = solveTargetFinalScore(course, simInClass, simMidterm, simTargetGrade)

  const currentAccumulated =
    Math.round(((course.weightInClass * simInClass) + (course.weightMidterm * simMidterm)) * 10) / 10

  const handleApply = () => {
    onApplyScores(simInClass, simMidterm, simTargetGrade)
    onClose()
  }

  const handleResetToCurrent = () => {
    setSimInClass(course.scoreInClass ?? 80)
    setSimMidterm(course.scoreMidterm ?? 75)
    setSimTargetGrade(course.targetGrade)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whatif-title"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="whatif-title" className="text-base font-semibold text-[#E0E6E4]">
                  What-If Grade Simulator
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1B2220] border border-[#2D3834] text-[#5B8266]">
                  {course.code}
                </span>
              </div>
              <p className="text-xs text-[#8C9E96]">
                Simulate how higher in-class participation lowers terminal exam burden.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C9E96] hover:text-[#E0E6E4] p-1.5 rounded-lg hover:bg-[#1B2220] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weights Summary Strip */}
        <div className="my-4 p-3 rounded-xl bg-[#1B2220] border border-[#2D3834] flex items-center justify-between text-xs font-mono text-[#8C9E96]">
          <span>In-Class: {(course.weightInClass * 100).toFixed(0)}%</span>
          <span>&bull;</span>
          <span>Midterm: {(course.weightMidterm * 100).toFixed(0)}%</span>
          <span>&bull;</span>
          <span>Final Exam: {(course.weightFinal * 100).toFixed(0)}%</span>
        </div>

        {/* Target Grade Selector */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-[#E0E6E4] mb-2">
            Desired Course Letter Grade Target:
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(['A+', 'A', 'B+', 'B', 'C'] as LetterGrade[]).map((grade) => {
              const threshold = TARGET_GRADE_THRESHOLDS[grade]
              const isSelected = simTargetGrade === grade
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSimTargetGrade(grade)}
                  className={`py-2 px-1 rounded-xl text-center border transition-all ${
                    isSelected
                      ? 'bg-[#5B8266]/25 border-[#5B8266] text-[#E0E6E4] ring-1 ring-[#5B8266]'
                      : 'bg-[#1B2220] border-[#2D3834] text-[#8C9E96] hover:border-[#3A4742] hover:text-[#E0E6E4]'
                  }`}
                >
                  <div className="font-mono font-bold text-sm">{grade}</div>
                  <div className="text-[10px] text-[#8C9E96]">(&ge;{threshold} pts)</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5 bg-[#1B2220]/60 p-4 rounded-xl border border-[#2D3834] mb-5">
          {/* In-Class Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-[#E0E6E4] font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5B8266]" />
                In-Class / Lab / Quizzes ({ (course.weightInClass * 100).toFixed(0) }% weight)
              </span>
              <span className="font-mono text-sm font-semibold text-[#5B8266]">{simInClass} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={simInClass}
              onChange={(e) => setSimInClass(Number(e.target.value))}
              className="w-full h-2 bg-[#131716] rounded-lg appearance-none cursor-pointer accent-[#5B8266]"
            />
            <div className="flex justify-between text-[10px] text-[#8C9E96] font-mono mt-1">
              <span>0 (Failed labs)</span>
              <span>Contributes: {((course.weightInClass * simInClass)).toFixed(1)} pts to final grade</span>
              <span>100 (Max)</span>
            </div>
          </div>

          {/* Midterm Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-[#E0E6E4] font-medium">
                Midterm Exam ({ (course.weightMidterm * 100).toFixed(0) }% weight)
              </span>
              <span className="font-mono text-sm font-semibold text-[#648381]">{simMidterm} / 100</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={simMidterm}
              onChange={(e) => setSimMidterm(Number(e.target.value))}
              className="w-full h-2 bg-[#131716] rounded-lg appearance-none cursor-pointer accent-[#648381]"
            />
            <div className="flex justify-between text-[10px] text-[#8C9E96] font-mono mt-1">
              <span>0 (0 pts)</span>
              <span>Contributes: {((course.weightMidterm * simMidterm)).toFixed(1)} pts to final grade</span>
              <span>100 (Max)</span>
            </div>
          </div>
        </div>

        {/* Result Solver Card */}
        <div className={`p-4 rounded-xl border mb-5 transition-all ${
          solverResult.status === 'SECURED'
            ? 'bg-[#18261F] border-[#5B9975]/40 text-[#E0E6E4]'
            : solverResult.status === 'ACHIEVABLE'
            ? 'bg-[#1D211F] border-[#5B8266]/40 text-[#E0E6E4]'
            : 'bg-[#261919] border-[#A36262]/40 text-[#E0E6E4]'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider font-mono text-[#8C9E96]">
              Target Equation Solver Result
            </span>
            {solverResult.status === 'SECURED' && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#5B9975]/20 text-[#5B9975] font-mono">
                <CheckCircle className="w-3.5 h-3.5" /> SECURED
              </span>
            )}
            {solverResult.status === 'ACHIEVABLE' && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#5B8266]/20 text-[#5B8266] font-mono">
                <ArrowRight className="w-3.5 h-3.5" /> REQUIRED SCORE
              </span>
            )}
            {solverResult.status === 'UNATTAINABLE' && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#A36262]/20 text-[#A36262] font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> UNATTAINABLE
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <div className="text-3xl font-mono font-bold">
              {solverResult.status === 'SECURED' ? (
                <span className="text-[#5B9975]">0.0 / 100</span>
              ) : solverResult.status === 'ACHIEVABLE' ? (
                <span className="text-[#E0E6E4]">{solverResult.requiredFinalScore.toFixed(1)} <span className="text-xs text-[#8C9E96] font-normal">/ 100</span></span>
              ) : (
                <span className="text-[#A36262]">{solverResult.requiredFinalScore.toFixed(1)} <span className="text-xs text-[#8C9E96] font-normal">/ 100</span></span>
              )}
            </div>
            <div className="text-xs text-[#8C9E96]">
              needed on Final Exam ({(course.weightFinal * 100).toFixed(0)}% weight)
            </div>
          </div>

          <p className="text-xs text-[#8C9E96]">
            {solverResult.message}
          </p>

          <div className="mt-3 pt-3 border-t border-[#2D3834]/60 text-[11px] font-mono text-[#8C9E96] flex justify-between">
            <span>Points locked before Final: <strong className="text-[#E0E6E4]">{currentAccumulated}</strong> pts</span>
            <span>Target Threshold: <strong className="text-[#E0E6E4]">{solverResult.targetThreshold}</strong> pts</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetToCurrent}
            className="text-xs text-[#8C9E96] hover:text-[#E0E6E4] underline transition-colors"
          >
            Reset to current scores
          </button>
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
              className="px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-md transition-colors"
            >
              Save Simulated Scores
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
