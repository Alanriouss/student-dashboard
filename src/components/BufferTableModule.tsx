import React, { useState } from 'react'
import type { Deliverable, DeliverableStatus, Project } from '../types'
import { getBufferUrgency, formatDateShort, formatDateDayOnly, canApproveDeliverable } from '../utils/bufferEngine'
import { DeliverableFormModal } from './DeliverableFormModal'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import {
  Plus,
  Filter,
  User,
  Users,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Trash2,
  Share2,
  Check,
  Settings,
  ShieldAlert,
} from 'lucide-react'

interface BufferTableModuleProps {
  deliverables: Deliverable[]
  projects: Project[]
  currentUser: string
  onUpdateDeliverables: (deliverables: Deliverable[]) => void
  onUpdateProjects: (projects: Project[]) => void
}

type ViewFilter = 'ALL' | 'PERSONAL' | 'TEAM_LEAD' | 'BUFFER_72H'

export const BufferTableModule: React.FC<BufferTableModuleProps> = ({
  deliverables,
  projects,
  currentUser,
  onUpdateDeliverables,
  onUpdateProjects,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL')
  const [viewFilter, setViewFilter] = useState<ViewFilter>('TEAM_LEAD')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [deliverableToEdit, setDeliverableToEdit] = useState<Deliverable | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null)

  // Filter deliverables
  const filteredDeliverables = deliverables.filter((d) => {
    // Project filter
    if (selectedProjectId !== 'ALL' && d.projectId !== selectedProjectId) {
      return false
    }

    // View Mode filter
    if (viewFilter === 'PERSONAL') {
      return d.ownerName.toLowerCase().includes(currentUser.toLowerCase())
    }

    if (viewFilter === 'BUFFER_72H') {
      const urgency = getBufferUrgency(d)
      return urgency.isApproachingBuffer || urgency.urgency === 'OVERDUE'
    }

    return true
  }).sort((a, b) => new Date(a.internalBufferDeadline).getTime() - new Date(b.internalBufferDeadline).getTime())

  // Find deliverables missing peer reviewers
  const missingReviewersCount = deliverables.filter(
    (d) => d.status !== 'APPROVED' && (!d.peerReviewer || !d.peerReviewer.trim())
  ).length

  const handleStatusChange = (id: string, newStatus: DeliverableStatus) => {
    const target = deliverables.find((d) => d.id === id)
    if (!target) return

    if (newStatus === 'APPROVED') {
      const check = canApproveDeliverable(target)
      if (!check.canApprove) {
        alert(check.reason)
        return
      }
    }

    const updated = deliverables.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    onUpdateDeliverables(updated)
  }

  const handleDeleteDeliverable = (id: string) => {
    const target = deliverables.find((d) => d.id === id)
    if (confirm(`Delete deliverable "${target?.taskName}"?`)) {
      onUpdateDeliverables(deliverables.filter((d) => d.id !== id))
    }
  }

  const handleSaveDeliverable = (data: Omit<Deliverable, 'id'> & { id?: string }) => {
    if (data.id) {
      // Edit
      const updated = deliverables.map((d) => (d.id === data.id ? ({ ...data, id: d.id } as Deliverable) : d))
      onUpdateDeliverables(updated)
    } else {
      // Add
      const newDel: Deliverable = {
        ...data,
        id: `del-${Date.now()}`,
      }
      onUpdateDeliverables([...deliverables, newDel])
    }
  }

  const handleCopyShareLink = (projectId: string) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#/project/${projectId}/view`
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedProjectId(projectId)
      setTimeout(() => setCopiedProjectId(null), 3000)
    })
  }

  return (
    <section className="space-y-6" aria-labelledby="buffer-table-title">
      {/* Module Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-3 border-b border-[#2D3834] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="buffer-table-title" className="text-lg font-semibold tracking-tight text-[#E0E6E4]">
              Milestone Buffer Table
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#997A5B]/20 text-[#B89674] border border-[#997A5B]/30 font-mono flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-[#997A5B]" />
              72h Safety Offset
            </span>
          </div>
          <p className="text-xs text-[#8C9E96]">
            Milestone-anchored buffer schedule with single-threaded DRI and peer review sign-offs
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#1B2220] text-xs text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Project Settings</span>
          </button>

          <button
            onClick={() => {
              const targetId = selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?.id
              if (targetId) handleCopyShareLink(targetId)
            }}
            title="Copy view-only link for group teammates"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#5B8266]/40 hover:border-[#5B8266] bg-[#5B8266]/15 text-xs text-[#E0E6E4] transition-colors"
          >
            {copiedProjectId ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#5B9975]" />
                <span className="text-[#5B9975]">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#5B8266]" />
                <span>Copy Teammate Link</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs font-medium text-[#E0E6E4] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Deliverable</span>
          </button>
        </div>
      </div>

      {/* Reviewer Warning Strip */}
      {missingReviewersCount > 0 && viewFilter === 'TEAM_LEAD' && (
        <div className="p-3 rounded-xl bg-[#261D16] border border-[#997A5B]/40 text-xs text-[#E0E6E4] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B89674] shrink-0" />
            <span>
              <strong>Review Accountability Warning:</strong> {missingReviewersCount} deliverable(s) are missing an assigned Peer Reviewer. Tasks cannot be APPROVED without peer verification.
            </span>
          </div>
        </div>
      )}

      {/* Filter and Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-[#1B2220] border border-[#2D3834]">
        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8C9E96] font-medium whitespace-nowrap">Filter Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-xs text-[#E0E6E4] outline-none font-medium"
          >
            <option value="ALL">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.courseCode} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#131716] p-1 rounded-lg border border-[#2D3834] self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setViewFilter('TEAM_LEAD')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewFilter === 'TEAM_LEAD'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Team Lead Mode</span>
          </button>

          <button
            onClick={() => setViewFilter('PERSONAL')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewFilter === 'PERSONAL'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <User className="w-3.5 h-3.5 text-[#648381]" />
            <span>My Tasks</span>
          </button>

          <button
            onClick={() => setViewFilter('BUFFER_72H')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewFilter === 'BUFFER_72H'
                ? 'bg-[#1B2220] text-[#B89674] border border-[#997A5B]/40 shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#997A5B]" />
            <span>Buffer Due (&lt;72h)</span>
          </button>

          <button
            onClick={() => setViewFilter('ALL')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              viewFilter === 'ALL'
                ? 'bg-[#1B2220] text-[#E0E6E4] border border-[#2D3834] shadow-sm'
                : 'text-[#8C9E96] hover:text-[#E0E6E4]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Tasks</span>
          </button>
        </div>
      </div>

      {/* Buffer Table - Desktop Grid with Horizontal Scroll */}
      <div className="rounded-2xl border border-[#2D3834] bg-[#171E1C] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#2D3834] bg-[#131716] text-[#8C9E96] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Deliverable / Sub-Task</th>
                <th className="py-3 px-3">Milestone Phase</th>
                <th className="py-3 px-3">Owner (DRI)</th>
                <th className="py-3 px-3">Internal Buffer (72h Early)</th>
                <th className="py-3 px-3">Official Due</th>
                <th className="py-3 px-3">Peer Reviewer</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Proof</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D3834]/60">
              {filteredDeliverables.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#8C9E96] text-xs">
                    No deliverables found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredDeliverables.map((del) => {
                  const urgency = getBufferUrgency(del)
                  const isPersonalTask = del.ownerName.toLowerCase().includes(currentUser.toLowerCase())
                  const parentProject = projects.find((p) => p.id === del.projectId)

                  return (
                    <tr
                      key={del.id}
                      className={`hover:bg-[#1B2220]/70 transition-colors ${
                        urgency.urgency === 'OVERDUE'
                          ? 'bg-[#211616]/30'
                          : urgency.urgency === 'CRITICAL_24H'
                          ? 'bg-[#231E16]/30'
                          : ''
                      }`}
                    >
                      {/* Deliverable Name */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#E0E6E4]">{del.taskName}</div>
                        <div className="text-[10px] text-[#8C9E96] font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="text-[#5B8266]">{parentProject?.courseCode || 'DS'}</span>
                          {del.notes && <span>&bull; {del.notes}</span>}
                        </div>
                      </td>

                      {/* Milestone Phase */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[#131716] border border-[#2D3834] text-[11px] font-mono text-[#8C9E96]">
                          {del.milestonePhase}
                        </span>
                      </td>

                      {/* Owner (DRI) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-medium ${
                              isPersonalTask ? 'text-[#5B8266] font-semibold' : 'text-[#E0E6E4]'
                            }`}
                          >
                            {del.ownerName}
                          </span>
                          {isPersonalTask && (
                            <span className="text-[9px] px-1 rounded bg-[#5B8266]/20 border border-[#5B8266]/40 text-[#5B8266]">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Internal Buffer Deadline with Countdown */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono">
                        <div className="text-[#E0E6E4] font-medium text-[11px]">
                          {formatDateShort(del.internalBufferDeadline)}
                        </div>
                        <div className="mt-0.5">
                          {urgency.urgency === 'COMPLETED' ? (
                            <span className="text-[10px] text-[#5B9975] flex items-center gap-1">
                              Signed Off
                            </span>
                          ) : urgency.urgency === 'OVERDUE' ? (
                            <span className="text-[10px] text-[#A36262] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-[#A36262]" />
                              {urgency.label}
                            </span>
                          ) : urgency.urgency === 'CRITICAL_24H' ? (
                            <span className="text-[10px] text-[#B89674] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-[#997A5B]" />
                              {urgency.label}
                            </span>
                          ) : urgency.urgency === 'WARNING_72H' ? (
                            <span className="text-[10px] text-[#B89674] flex items-center gap-1">
                              {urgency.label}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8C9E96]">
                              {urgency.label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Official University Due Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[#8C9E96]">
                        {formatDateDayOnly(del.officialDueDate)}
                      </td>

                      {/* Peer Reviewer */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {del.peerReviewer ? (
                          <span className="text-[#E0E6E4]">{del.peerReviewer}</span>
                        ) : (
                          <span className="text-[#A36262] italic text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          value={del.status}
                          onChange={(e) => handleStatusChange(del.id, e.target.value as DeliverableStatus)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-mono font-medium outline-none transition-colors ${
                            del.status === 'APPROVED'
                              ? 'bg-[#18261F] border-[#5B9975]/40 text-[#5B9975]'
                              : del.status === 'DRAFT_READY'
                              ? 'bg-[#1B2220] border-[#648381]/50 text-[#648381]'
                              : del.status === 'IN_PROGRESS'
                              ? 'bg-[#1F241C] border-[#5B8266]/50 text-[#5B8266]'
                              : 'bg-[#1B1B1B] border-[#2D3834] text-[#8C9E96]'
                          }`}
                        >
                          <option value="NOT_STARTED">NOT STARTED</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="DRAFT_READY">DRAFT READY</option>
                          <option value="APPROVED">APPROVED</option>
                        </select>
                      </td>

                      {/* Proof Link */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {del.artifactUrl ? (
                          <a
                            href={del.artifactUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-[#131716] text-[#648381] hover:text-[#E0E6E4] transition-colors inline-flex items-center gap-1"
                            title="Open PR / Document"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Proof</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-[#8C9E96] italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDeliverableToEdit(del)}
                            className="p-1.5 rounded-lg text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#131716] transition-colors"
                            title="Edit deliverable"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDeliverable(del.id)}
                            className="p-1.5 rounded-lg text-[#8C9E96] hover:text-[#A36262] hover:bg-[#2A1717] transition-colors"
                            title="Delete deliverable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deliverable Create / Edit Modal */}
      {(isAddModalOpen || deliverableToEdit) && (
        <DeliverableFormModal
          deliverable={deliverableToEdit}
          projects={projects}
          defaultProjectId={selectedProjectId !== 'ALL' ? selectedProjectId : projects[0]?.id}
          isOpen={true}
          onClose={() => {
            setIsAddModalOpen(false)
            setDeliverableToEdit(null)
          }}
          onSave={handleSaveDeliverable}
        />
      )}

      {/* Project Settings Modal */}
      {isSettingsOpen && (
        <ProjectSettingsModal
          projects={projects}
          isOpen={true}
          onClose={() => setIsSettingsOpen(false)}
          onUpdateProjects={onUpdateProjects}
        />
      )}
    </section>
  )
}
