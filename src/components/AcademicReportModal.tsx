import React, { useState } from 'react'
import type { Course, Deliverable, Project } from '../types'
import { solveTargetFinalScore, calculateSemesterGPAs } from '../utils/gradeEngine'
import {
  X,
  Printer,
  Copy,
  Download,
  Check,
  FileCheck,
  Award,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

interface AcademicReportModalProps {
  isOpen: boolean
  onClose: () => void
  courses: Course[]
  deliverables: Deliverable[]
  projects?: Project[]
  currentUser: string
}

export const AcademicReportModal: React.FC<AcademicReportModalProps> = ({
  isOpen,
  onClose,
  courses,
  deliverables,
  projects = [],
  currentUser,
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  // Compute GPA and statistics
  const gpaMetrics = calculateSemesterGPAs(courses)
  const totalDeliverables = deliverables.length
  const approvedDeliverables = deliverables.filter((d) => d.status === 'APPROVED').length
  const pendingReview = deliverables.filter((d) => d.status === 'DRAFT_READY').length
  const inProgress = deliverables.filter((d) => d.status === 'IN_PROGRESS').length
  const notStarted = deliverables.filter((d) => d.status === 'NOT_STARTED').length
  const projectMap = new Map((projects || []).map((p) => [p.id, p.name]))

  // DRI workload distribution
  const driMap = new Map<string, number>()
  for (const d of deliverables) {
    if (d.ownerName) {
      driMap.set(d.ownerName, (driMap.get(d.ownerName) || 0) + 1)
    }
  }

  // Generate Markdown report string
  const generateMarkdownReport = (): string => {
    const lines: string[] = [
      `# Academic Performance & Milestone Audit Report`,
      `*Generated on: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}*`,
      `*Student / Workspace Lead: ${currentUser}*`,
      ``,
      `---`,
      ``,
      `## 1. Academic Executive Summary`,
      `- **Projected Semester GPA:** ${gpaMetrics.gpa4.toFixed(2)} / 4.00`,
      `- **Weighted 100-Point Average:** ${gpaMetrics.gpa100.toFixed(1)} / 100`,
      `- **Total Enrolled Credits:** ${gpaMetrics.totalCredits} (${gpaMetrics.earnedCredits} on track)`,
      ``,
      `### Course Breakdown & Target Grade Solver`,
      `| Course | Title | Credits | In-Class | Midterm | Final Target | Target Grade | Solver Status |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`,
    ]

    courses.forEach((c) => {
      const targetSolver = solveTargetFinalScore(c)
      const requiredStr =
        targetSolver.status === 'SECURED'
          ? 'Secured'
          : targetSolver.requiredFinalScore !== null
          ? `${targetSolver.requiredFinalScore.toFixed(1)}`
          : 'N/A'

      lines.push(
        `| ${c.code} | ${c.title} | ${c.credits} | ${c.scoreInClass ?? '—'} | ${c.scoreMidterm ?? '—'} | ${requiredStr} | ${c.targetGrade} | ${targetSolver.status} |`
      )
    })

    lines.push(
      ``,
      `---`,
      ``,
      `## 2. Milestone Buffer Table & DRI Ownership Audit`,
      `- **Total Project Deliverables:** ${totalDeliverables}`,
      `- **Peer Approved:** ${approvedDeliverables} (${totalDeliverables ? ((approvedDeliverables / totalDeliverables) * 100).toFixed(0) : 0}%)`,
      `- **Awaiting Peer Review:** ${pendingReview}`,
      `- **In Progress:** ${inProgress}`,
      `- **Not Started:** ${notStarted}`,
      ``,
      `### DRI Workload Distribution (Single-Threaded Accountability)`,
      `| Team Member (DRI) | Assigned Deliverables | Accountability Share |`,
      `| :--- | :--- | :--- |`
    )

    for (const [owner, count] of driMap.entries()) {
      const share = totalDeliverables ? ((count / totalDeliverables) * 100).toFixed(0) : 0
      lines.push(`| ${owner} | ${count} | ${share}% |`)
    }

    lines.push(
      ``,
      `### Approaching 72-Hour Safety Buffer Deadlines`,
      `| Task | Phase | DRI | Internal 72h Deadline | Official Due Date | Reviewer | Status |`,
      `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
    )

    deliverables
      .filter((d) => d.status !== 'APPROVED')
      .slice(0, 8)
      .forEach((d) => {
        const intDate = new Date(d.internalBufferDeadline).toLocaleDateString()
        const offDate = new Date(d.officialDueDate).toLocaleDateString()
        lines.push(`| ${d.taskName} | ${d.milestonePhase} | ${d.ownerName} | ${intDate} | ${offDate} | ${d.peerReviewer || 'Unassigned'} | ${d.status} |`)
      })

    lines.push(
      ``,
      `---`,
      `*Report certified by Student Operations & Academic Analytics Hub.*`
    )

    return lines.join('\n')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdownReport())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const text = generateMarkdownReport()
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `academic_audit_report_${new Date().toISOString().substring(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#1B2220] border border-[#2D3834] rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2D3834] flex items-center justify-between bg-[#131716]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#5B8266]/15 border border-[#5B8266]/30 text-[#5B8266]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E0E6E4]">
                Academic &amp; Milestone Audit Report
              </h2>
              <p className="text-xs text-[#8C9E96]">
                Consolidated performance metrics, final exam solver requirements, and group DRI audits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-xs font-medium text-[#E0E6E4] border border-[#2D3834] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#5B8266]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131716] hover:bg-[#232C2A] text-xs font-medium text-[#E0E6E4] border border-[#2D3834] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-semibold text-[#E0E6E4] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#131716] transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Report View */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-[#E0E6E4]">
          {/* Top Banner KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#131716] border border-[#2D3834]">
              <div className="text-[11px] text-[#8C9E96] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#5B8266]" />
                Projected GPA
              </div>
              <div className="text-xl font-bold font-mono text-[#5B8266] mt-1">
                {gpaMetrics.gpa4.toFixed(2)}
                <span className="text-xs text-[#8C9E96] font-normal"> / 4.00</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131716] border border-[#2D3834]">
              <div className="text-[11px] text-[#8C9E96] flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#648381]" />
                100-Pt Average
              </div>
              <div className="text-xl font-bold font-mono text-[#E0E6E4] mt-1">
                {gpaMetrics.gpa100.toFixed(1)}
                <span className="text-xs text-[#8C9E96] font-normal"> / 100</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131716] border border-[#2D3834]">
              <div className="text-[11px] text-[#8C9E96] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5B8266]" />
                Buffer Sign-offs
              </div>
              <div className="text-xl font-bold font-mono text-[#5B8266] mt-1">
                {approvedDeliverables}
                <span className="text-xs text-[#8C9E96] font-normal"> / {totalDeliverables} ({totalDeliverables ? ((approvedDeliverables / totalDeliverables) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#131716] border border-[#2D3834]">
              <div className="text-[11px] text-[#8C9E96] flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-[#997A5B]" />
                Team DRIs
              </div>
              <div className="text-xl font-bold font-mono text-[#997A5B] mt-1">
                {driMap.size}
                <span className="text-xs text-[#8C9E96] font-normal"> Active Members</span>
              </div>
            </div>
          </div>

          {/* Section 1: Course Targets & Solver */}
          <div className="p-4 rounded-xl bg-[#131716] border border-[#2D3834]">
            <h3 className="text-xs font-semibold text-[#5B8266] uppercase tracking-wider mb-3">
              Enrolled Courses &amp; Target Grade Solver
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#2D3834] text-[#8C9E96]">
                    <th className="pb-2 font-medium">Course</th>
                    <th className="pb-2 font-medium">Credits</th>
                    <th className="pb-2 font-medium">In-Class</th>
                    <th className="pb-2 font-medium">Midterm</th>
                    <th className="pb-2 font-medium">Target Grade</th>
                    <th className="pb-2 font-medium">Req. Final Exam</th>
                    <th className="pb-2 font-medium text-right">Solver Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2D3834]/50">
                  {courses.map((c) => {
                    const solver = solveTargetFinalScore(c)
                    return (
                      <tr key={c.id} className="hover:bg-[#1B2220]/50 transition-colors">
                        <td className="py-2.5">
                          <span className="font-bold text-[#E0E6E4]">{c.code}</span>
                          <span className="text-[#8C9E96] ml-2 font-sans">{c.title}</span>
                        </td>
                        <td className="py-2.5 text-[#8C9E96]">{c.credits}</td>
                        <td className="py-2.5 text-[#E0E6E4]">{c.scoreInClass ?? '—'}</td>
                        <td className="py-2.5 text-[#E0E6E4]">{c.scoreMidterm ?? '—'}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded bg-[#5B8266]/20 text-[#5B8266] border border-[#5B8266]/30 font-bold">
                            {c.targetGrade}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">
                          {solver.status === 'SECURED' ? (
                            <span className="text-[#5B8266]">Secured</span>
                          ) : solver.requiredFinalScore !== null ? (
                            <span className={solver.requiredFinalScore > 90 ? 'text-[#997A5B]' : 'text-[#E0E6E4]'}>
                              {solver.requiredFinalScore.toFixed(1)} / 100
                            </span>
                          ) : (
                            <span className="text-[#A36262]">Impossible</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`text-[11px] px-2 py-0.5 rounded ${
                            solver.status === 'SECURED'
                              ? 'bg-[#5B8266]/15 text-[#5B8266]'
                              : solver.status === 'ACHIEVABLE'
                              ? (solver.requiredFinalScore !== null && solver.requiredFinalScore > 85 ? 'bg-[#997A5B]/15 text-[#997A5B]' : 'bg-[#5B8266]/15 text-[#5B8266]')
                              : 'bg-[#A36262]/15 text-[#A36262]'
                          }`}>
                            {solver.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Milestone Buffer & DRI Accountability */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DRI Distribution */}
            <div className="p-4 rounded-xl bg-[#131716] border border-[#2D3834]">
              <h3 className="text-xs font-semibold text-[#5B8266] uppercase tracking-wider mb-3">
                DRI Workload Distribution (Single Accountability)
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {Array.from(driMap.entries()).map(([dri, count]) => {
                  const share = totalDeliverables ? Math.round((count / totalDeliverables) * 100) : 0
                  return (
                    <div key={dri} className="flex items-center justify-between p-2 rounded-lg bg-[#1B2220] border border-[#2D3834]">
                      <span className="text-[#E0E6E4] font-medium">{dri}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#8C9E96]">{count} tasks ({share}%)</span>
                        <div className="w-16 h-1.5 rounded-full bg-[#131716] overflow-hidden">
                          <div className="h-full bg-[#5B8266]" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upcoming 72h Buffer Deadlines */}
            <div className="p-4 rounded-xl bg-[#131716] border border-[#2D3834]">
              <h3 className="text-xs font-semibold text-[#5B8266] uppercase tracking-wider mb-3">
                Next Approaching Safety Buffers
              </h3>
              <div className="space-y-2 text-xs">
                {deliverables
                  .filter((d) => d.status !== 'APPROVED')
                  .slice(0, 4)
                  .map((d) => (
                    <div key={d.id} className="p-2.5 rounded-lg bg-[#1B2220] border border-[#2D3834]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#E0E6E4] line-clamp-1">
                          {projectMap.has(d.projectId) ? `${projectMap.get(d.projectId)}: ` : ''}
                          {d.taskName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#997A5B]/20 text-[#997A5B] shrink-0">
                          {d.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-[#8C9E96] font-mono">
                        <span>DRI: {d.ownerName}</span>
                        <span>Buffer: {new Date(d.internalBufferDeadline).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2D3834] bg-[#131716] flex items-center justify-between text-xs text-[#8C9E96]">
          <span>Student Operations &amp; Academic Analytics Hub &bull; Institutional Verification Standard</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1B2220] hover:bg-[#2A3532] text-[#E0E6E4] border border-[#2D3834] transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  )
}
