import React, { useState, useMemo } from 'react'
import type { Course, LetterGrade } from '../types'
import {
  calculateCourseCompositeScore,
  solveTargetFinalScore,
  calculateSemesterGPAs,
  GRADE_SCALE,
} from '../utils/gradeEngine'
import { WhatIfSimulatorModal } from './WhatIfSimulatorModal'
import { CourseFormModal } from './CourseFormModal'
import { CourseNotesModal } from './CourseNotesModal'
import {
  Plus,
  Sliders,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  BookOpen,
  GraduationCap,
  Calendar,
} from 'lucide-react'

interface AcademicModuleProps {
  courses: Course[]
  onUpdateCourses: (courses: Course[]) => void
  onOpenGpaOptimizer: () => void
}

export const AcademicModule: React.FC<AcademicModuleProps> = ({
  courses,
  onUpdateCourses,
  onOpenGpaOptimizer,
}) => {
  const [selectedCourseForWhatIf, setSelectedCourseForWhatIf] = useState<Course | null>(null)
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null)
  const [courseForNotes, setCourseForNotes] = useState<Course | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [showGradingScale, setShowGradingScale] = useState(false)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('ALL')
  const [collapsedSemesters, setCollapsedSemesters] = useState<Record<string, boolean>>({})

  const toggleCollapseSemester = (sem: string) => {
    setCollapsedSemesters((prev) => ({ ...prev, [sem]: !prev[sem] }))
  }

  const semesterGroups = useMemo(() => {
    const map = new Map<string, Course[]>()
    for (const c of courses) {
      const sem = c.semester?.trim() || 'Fall 2026'
      if (!map.has(sem)) map.set(sem, [])
      map.get(sem)!.push(c)
    }

    // Sort descending by semester name (e.g. Fall 2026 before Spring 2026)
    const sortedSemesters = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))

    return sortedSemesters.map((sem) => {
      const semCourses = map.get(sem)!
      const metrics = calculateSemesterGPAs(semCourses)
      return {
        semester: sem,
        courses: semCourses,
        metrics,
      }
    })
  }, [courses])

  const visibleGroups = useMemo(() => {
    if (selectedSemesterFilter === 'ALL') return semesterGroups
    return semesterGroups.filter(
      (g) => g.semester.toLowerCase() === selectedSemesterFilter.toLowerCase()
    )
  }, [semesterGroups, selectedSemesterFilter])

  const handleSaveNotes = (courseId: string, notes: string) => {
    const updated = courses.map((c) => (c.id === courseId ? { ...c, notes } : c))
    onUpdateCourses(updated)
    if (courseForNotes && courseForNotes.id === courseId) {
      setCourseForNotes({ ...courseForNotes, notes })
    }
  }

  const handleSaveCourse = (courseData: Omit<Course, 'id'> & { id?: string }) => {
    if (courseData.id) {
      // Edit
      const updated = courses.map((c) => (c.id === courseData.id ? ({ ...courseData, id: c.id } as Course) : c))
      onUpdateCourses(updated)
    } else {
      // Add
      const newCourse: Course = {
        ...courseData,
        id: `c-${Date.now()}`,
      }
      onUpdateCourses([...courses, newCourse])
    }
  }

  const handleDeleteCourse = (id: string) => {
    const target = courses.find((c) => c.id === id)
    if (confirm(`Are you sure you want to remove "${target?.code} - ${target?.title}"?`)) {
      onUpdateCourses(courses.filter((c) => c.id !== id))
    }
  }

  const handleApplySimulatedScores = (inClass: number, midterm: number, targetGrade: LetterGrade) => {
    if (!selectedCourseForWhatIf) return
    const updated = courses.map((c) => {
      if (c.id === selectedCourseForWhatIf.id) {
        return {
          ...c,
          scoreInClass: inClass,
          scoreMidterm: midterm,
          targetGrade,
        }
      }
      return c
    })
    onUpdateCourses(updated)
  }

  const renderCourseCard = (course: Course) => {
    const { score100, isProjected, hasFinal, gradeEntry } = calculateCourseCompositeScore(course)
    const targetSolver = solveTargetFinalScore(course)

    return (
      <div
        key={course.id}
        className="p-5 rounded-2xl bg-[#1B2220] border border-[#2D3834] hover:border-[#3A4742] transition-all flex flex-col justify-between"
      >
        <div>
          {/* Course Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#131716] border border-[#2D3834] font-mono text-xs font-semibold text-[#5B8266]">
                  {course.code}
                </span>
                <span className="text-xs text-[#8C9E96] font-mono">{course.credits} Credits</span>
              </div>
              <h3 className="text-sm font-semibold text-[#E0E6E4] mt-1 line-clamp-1">
                {course.title}
              </h3>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCourseForNotes(course)}
                title="Study Notes & Formulas"
                className="p-1.5 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#648381] hover:text-[#E0E6E4] border border-[#2D3834] hover:border-[#648381]/50 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedCourseForWhatIf(course)}
                title="Open What-If Simulator"
                className="p-1.5 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#5B8266] border border-[#2D3834] hover:border-[#5B8266]/50 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCourseToEdit(course)}
                title="Edit Course"
                className="p-1.5 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteCourse(course.id)}
                title="Delete Course"
                className="p-1.5 rounded-lg bg-[#131716] hover:bg-[#2A1717] text-[#8C9E96] hover:text-[#A36262] border border-[#2D3834] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Score Breakdown Table */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#131716] border border-[#2D3834] text-center font-mono mb-3">
            <div>
              <div className="text-[10px] text-[#8C9E96]">In-Class ({(course.weightInClass * 100).toFixed(0)}%)</div>
              <div className="text-xs font-semibold text-[#E0E6E4] mt-0.5">
                {course.scoreInClass !== null ? `${course.scoreInClass}` : '—'}
              </div>
            </div>
            <div className="border-x border-[#2D3834]">
              <div className="text-[10px] text-[#8C9E96]">Midterm ({(course.weightMidterm * 100).toFixed(0)}%)</div>
              <div className="text-xs font-semibold text-[#E0E6E4] mt-0.5">
                {course.scoreMidterm !== null ? `${course.scoreMidterm}` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8C9E96]">Final ({(course.weightFinal * 100).toFixed(0)}%)</div>
              <div className="text-xs font-semibold text-[#E0E6E4] mt-0.5">
                {course.scoreFinal !== null ? `${course.scoreFinal}` : <span className="text-[#8C9E96] font-normal italic">Pending</span>}
              </div>
            </div>
          </div>

          {/* Current Standing */}
          <div className="flex items-center justify-between text-xs px-1 mb-3">
            <span className="text-[#8C9E96]">
              {hasFinal ? 'Final Grade' : isProjected ? 'Current Pace (Projected)' : 'Standing'}:
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#E0E6E4]">{score100.toFixed(1)} / 100</span>
              <span className="px-2 py-0.2 rounded bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#E0E6E4] font-mono font-semibold">
                {gradeEntry.letterGrade} ({gradeEntry.gpa4.toFixed(1)})
              </span>
            </div>
          </div>
        </div>

        {/* Predictive Target Solver Strip */}
        <div className={`p-3 rounded-xl border mt-2 text-xs transition-colors ${
          hasFinal
            ? 'bg-[#18201E] border-[#2D3834]'
            : targetSolver.status === 'SECURED'
            ? 'bg-[#18261F] border-[#5B9975]/30'
            : targetSolver.status === 'ACHIEVABLE'
            ? 'bg-[#1D211F] border-[#5B8266]/30'
            : 'bg-[#261919] border-[#A36262]/30'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-[#8C9E96] flex items-center gap-1">
              <span>Target Grade:</span>
              <strong className="text-[#E0E6E4] font-mono">{course.targetGrade}</strong>
            </span>
            {hasFinal ? (
              <span className="text-[10px] font-mono text-[#5B9975]">Completed</span>
            ) : targetSolver.status === 'SECURED' ? (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#5B9975]">
                <CheckCircle className="w-3 h-3" /> SECURED
              </span>
            ) : targetSolver.status === 'ACHIEVABLE' ? (
              <span className="text-[10px] font-mono text-[#5B8266]">
                Exam Target: <strong className="text-[#E0E6E4]">{targetSolver.requiredFinalScore.toFixed(1)}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-mono text-[#A36262]">
                <AlertTriangle className="w-3 h-3" /> UNATTAINABLE
              </span>
            )}
          </div>

          {!hasFinal && (
            <p className="text-[11px] text-[#8C9E96]">
              {targetSolver.message}
            </p>
          )}

          <div className="flex justify-end mt-2 pt-1 border-t border-[#2D3834]/50">
            <button
              onClick={() => setSelectedCourseForWhatIf(course)}
              className="text-[11px] text-[#5B8266] hover:text-[#6E997B] flex items-center gap-1 font-medium transition-colors"
            >
              <span>Simulate What-If Sliders</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6" aria-labelledby="academic-hub-title">
      {/* Module Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#2D3834] gap-3">
        <div>
          <h2 id="academic-hub-title" className="text-lg font-semibold tracking-tight text-[#E0E6E4]">
            Academic Performance &amp; Predictive Target Solver
          </h2>
          <p className="text-xs text-[#8C9E96]">
            Coursework component weighting, institutional 4.0 conversions, and final exam threshold solver
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenGpaOptimizer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5B8266]/40 hover:border-[#5B8266] bg-[#5B8266]/15 hover:bg-[#5B8266]/25 text-xs text-[#E0E6E4] font-medium transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Semester GPA Optimizer</span>
          </button>
          <button
            onClick={() => setShowGradingScale(!showGradingScale)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#1B2220] text-xs text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
          >
            <Info className="w-3.5 h-3.5 text-[#648381]" />
            <span>Grading Standards</span>
            {showGradingScale ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Collapsible Institutional Grading Scale Table */}
      {showGradingScale && (
        <div className="p-4 rounded-xl bg-[#171E1C] border border-[#2D3834] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[#E0E6E4] uppercase tracking-wider font-mono">
              Institutional Grading &amp; Conversion Standards
            </h4>
            <span className="text-[11px] text-[#8C9E96]">Sophomore Data Science Curriculum</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2D3834] text-[#8C9E96]">
                  <th className="py-1.5 px-2">Score Range</th>
                  <th className="py-1.5 px-2">Letter</th>
                  <th className="py-1.5 px-2">4.0 GPA</th>
                  <th className="py-1.5 px-2">Classification</th>
                  <th className="py-1.5 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3834]/50">
                {GRADE_SCALE.map((scale) => (
                  <tr key={scale.letterGrade} className="hover:bg-[#1B2220]/50">
                    <td className="py-1.5 px-2 text-[#E0E6E4]">{scale.minScore} &le; Score {scale.maxScore === 100 ? '&le; 100' : `< ${scale.maxScore + 0.01}`}</td>
                    <td className="py-1.5 px-2 font-bold text-[#5B8266]">{scale.letterGrade}</td>
                    <td className="py-1.5 px-2 text-[#E0E6E4]">{scale.gpa4.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-[#8C9E96]">{scale.classification}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${scale.status === 'Pass' ? 'text-[#5B9975] bg-[#5B9975]/10' : 'text-[#A36262] bg-[#A36262]/10'}`}>
                        {scale.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Semester Filter Tabs Bar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1B2220] border border-[#2D3834] flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-[#8C9E96] font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#5B8266]" />
            Semester:
          </span>
          <button
            onClick={() => setSelectedSemesterFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedSemesterFilter === 'ALL'
                ? 'bg-[#5B8266] text-[#E0E6E4] shadow-xs'
                : 'bg-[#131716] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834]'
            }`}
          >
            All Semesters ({courses.length})
          </button>
          {semesterGroups.map((g) => (
            <button
              key={g.semester}
              onClick={() => setSelectedSemesterFilter(g.semester)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedSemesterFilter === g.semester
                  ? 'bg-[#5B8266] text-[#E0E6E4] shadow-xs'
                  : 'bg-[#131716] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834]'
              }`}
            >
              {g.semester} ({g.courses.length})
            </button>
          ))}
        </div>

        <div className="text-xs text-[#8C9E96] font-mono">
          Showing {visibleGroups.reduce((acc, g) => acc + g.courses.length, 0)} courses in {visibleGroups.length} semester{visibleGroups.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Semester Groups Display */}
      <div className="space-y-6">
        {visibleGroups.map((group) => {
          const isCollapsed = Boolean(collapsedSemesters[group.semester])
          return (
            <div key={group.semester} className="space-y-3">
              {/* Semester Header Strip */}
              <div className="p-3.5 rounded-xl bg-[#171E1C] border border-[#2D3834] flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#E0E6E4] font-mono tracking-tight">
                        {group.semester}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#131716] text-[#8C9E96] border border-[#2D3834] font-mono">
                        {group.courses.length} Course{group.courses.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Semester Statistics Summary */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <div className="px-2.5 py-1 rounded-lg bg-[#131716] border border-[#2D3834] flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8C9E96]">Semester GPA:</span>
                      <span className="font-bold text-[#5B8266]">{group.metrics.gpa4.toFixed(2)}</span>
                      <span className="text-[#8C9E96] text-[10px]">/ 4.00</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#131716] border border-[#2D3834] hidden sm:flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8C9E96]">100-pt:</span>
                      <span className="font-bold text-[#E0E6E4]">{group.metrics.gpa100.toFixed(1)}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#131716] border border-[#2D3834] hidden sm:flex items-center gap-1.5">
                      <span className="text-[10px] text-[#8C9E96]">Credits:</span>
                      <span className="font-bold text-[#E0E6E4]">{group.metrics.totalCredits}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleCollapseSemester(group.semester)}
                    className="p-1 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-[#8C9E96] hover:text-[#E0E6E4] border border-[#2D3834] transition-colors"
                    title={isCollapsed ? 'Expand Semester' : 'Collapse Semester'}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Course Cards Grid */}
              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.courses.map((course) => renderCourseCard(course))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Course Edit/Create Modal */}
      {(isCreateModalOpen || courseToEdit) && (
        <CourseFormModal
          course={courseToEdit}
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false)
            setCourseToEdit(null)
          }}
          onSave={handleSaveCourse}
        />
      )}

      {/* What-If Simulator Modal */}
      {selectedCourseForWhatIf && (
        <WhatIfSimulatorModal
          course={selectedCourseForWhatIf}
          isOpen={true}
          onClose={() => setSelectedCourseForWhatIf(null)}
          onApplyScores={handleApplySimulatedScores}
        />
      )}

      {/* Course Notes & Formulas Modal */}
      {courseForNotes && (
        <CourseNotesModal
          course={courseForNotes}
          isOpen={true}
          onClose={() => setCourseForNotes(null)}
          onSaveNotes={handleSaveNotes}
        />
      )}
    </section>
  )
}
