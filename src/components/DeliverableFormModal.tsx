import React, { useState } from 'react'
import type { Deliverable, DeliverableStatus, Project } from '../types'
import { computeDefaultBufferDate, validateSingleDRI, canApproveDeliverable } from '../utils/bufferEngine'
import { X, Calendar, AlertCircle, Link as LinkIcon, UserCheck, ShieldAlert } from 'lucide-react'

interface DeliverableFormModalProps {
  deliverable?: Deliverable | null
  projects: Project[]
  defaultProjectId?: string
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Deliverable, 'id'> & { id?: string }) => void
}

export const DeliverableFormModal: React.FC<DeliverableFormModalProps> = ({
  deliverable,
  projects,
  defaultProjectId,
  isOpen,
  onClose,
  onSave,
}) => {
  const [projectId, setProjectId] = useState(deliverable?.projectId ?? defaultProjectId ?? projects[0]?.id ?? '')
  const [taskName, setTaskName] = useState(deliverable?.taskName ?? '')
  const [milestonePhase, setMilestonePhase] = useState(deliverable?.milestonePhase ?? 'Phase 2 (Midterm)')
  const [ownerName, setOwnerName] = useState(deliverable?.ownerName ?? '')
  const [officialDueDate, setOfficialDueDate] = useState(() =>
    deliverable?.officialDueDate
      ? new Date(deliverable.officialDueDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 16)
  )
  const [internalBufferDeadline, setInternalBufferDeadline] = useState(() =>
    deliverable?.internalBufferDeadline
      ? new Date(deliverable.internalBufferDeadline).toISOString().slice(0, 16)
      : new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 16)
  )
  const [autoBufferEnabled, setAutoBufferEnabled] = useState(!deliverable)
  const [peerReviewer, setPeerReviewer] = useState(deliverable?.peerReviewer ?? '')
  const [status, setStatus] = useState<DeliverableStatus>(deliverable?.status ?? 'NOT_STARTED')
  const [artifactUrl, setArtifactUrl] = useState(deliverable?.artifactUrl ?? '')
  const [notes, setNotes] = useState(deliverable?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const handleOfficialDueChange = (val: string) => {
    setOfficialDueDate(val)
    if (autoBufferEnabled && val) {
      const calculatedIso = computeDefaultBufferDate(new Date(val).toISOString(), 72)
      setInternalBufferDeadline(new Date(calculatedIso).toISOString().slice(0, 16))
    }
  }

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!taskName.trim()) {
      setError('Deliverable task name is required.')
      return
    }

    const driValidation = validateSingleDRI(ownerName)
    if (!driValidation.isValid) {
      setError(driValidation.error || 'Invalid DRI.')
      return
    }

    const testDeliverable: Deliverable = {
      id: deliverable?.id ?? 'temp',
      projectId,
      taskName: taskName.trim(),
      milestonePhase: milestonePhase.trim(),
      ownerName: ownerName.trim(),
      internalBufferDeadline: new Date(internalBufferDeadline).toISOString(),
      officialDueDate: new Date(officialDueDate).toISOString(),
      peerReviewer: peerReviewer.trim(),
      status,
      artifactUrl: artifactUrl.trim(),
      notes: notes.trim(),
    }

    if (status === 'APPROVED') {
      const approvalCheck = canApproveDeliverable(testDeliverable)
      if (!approvalCheck.canApprove) {
        setError(approvalCheck.reason || 'Cannot approve deliverable.')
        return
      }
    }

    onSave({
      ...(deliverable ? { id: deliverable.id } : {}),
      projectId,
      taskName: taskName.trim(),
      milestonePhase: milestonePhase.trim(),
      ownerName: ownerName.trim(),
      internalBufferDeadline: new Date(internalBufferDeadline).toISOString(),
      officialDueDate: new Date(officialDueDate).toISOString(),
      peerReviewer: peerReviewer.trim(),
      status,
      artifactUrl: artifactUrl.trim(),
      notes: notes.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E0E6E4]">
                {deliverable ? 'Edit Milestone Deliverable' : 'Add New Buffer Deliverable'}
              </h3>
              <p className="text-xs text-[#8C9E96]">
                Single-Threaded Ownership (DRI) &amp; 72-Hour Internal Safety Buffer
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
          <div className="my-3 p-3 rounded-lg bg-[#2A1717] border border-[#A36262]/40 text-xs text-[#E0E6E4] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#A36262] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          {/* Project & Milestone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Assigned Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.courseCode} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Milestone Phase</label>
              <input
                type="text"
                placeholder="e.g. Phase 2 (Midterm)"
                value={milestonePhase}
                onChange={(e) => setMilestonePhase(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
                required
              />
            </div>
          </div>

          {/* Task Name */}
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium">Deliverable / Task Name</label>
            <input
              type="text"
              placeholder="e.g. Balanced BST Module (Red-Black & AVL)"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
              required
            />
          </div>

          {/* DRI Rule Alert */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
                <span>Single Owner (DRI)</span>
                <span className="text-[10px] text-[#5B8266] font-mono">(Strictly 1 Person)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Alex (no '&' or 'and')"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-[#648381]" />
                <span>Peer Reviewer</span>
                <span className="text-[10px] text-[#8C9E96]">(Sign-off Gate)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dung (different from DRI)"
                value={peerReviewer}
                onChange={(e) => setPeerReviewer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#648381] text-[#E0E6E4] outline-none"
              />
            </div>
          </div>

          {/* Deadlines with 72h Buffer */}
          <div className="p-3.5 rounded-xl bg-[#1B2220] border border-[#2D3834]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-[#E0E6E4] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#997A5B]" />
                Deadlines &amp; Buffer Offset
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-[#8C9E96] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBufferEnabled}
                  onChange={(e) => setAutoBufferEnabled(e.target.checked)}
                  className="rounded bg-[#131716] border-[#2D3834] accent-[#5B8266]"
                />
                <span>Auto 72h Buffer</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8C9E96] text-[10px] mb-1">
                  Official Portal Due Date (Professor's Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={officialDueDate}
                  onChange={(e) => handleOfficialDueChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[#997A5B] text-[10px] mb-1 font-medium">
                  Internal Buffer Deadline (72h Safety Window)
                </label>
                <input
                  type="datetime-local"
                  value={internalBufferDeadline}
                  onChange={(e) => {
                    setInternalBufferDeadline(e.target.value)
                    setAutoBufferEnabled(false)
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#997A5B]/40 focus:border-[#997A5B] text-[#B89674] font-mono outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Status & Proof Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Task Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliverableStatus)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
              >
                <option value="NOT_STARTED">NOT STARTED</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DRAFT_READY">DRAFT READY</option>
                <option value="APPROVED">APPROVED (Requires Reviewer Sign-off)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium flex items-center gap-1">
                <LinkIcon className="w-3 h-3 text-[#648381]" />
                <span>Artifact Proof URL</span>
              </label>
              <input
                type="url"
                placeholder="https://github.com/.../pull/12"
                value={artifactUrl}
                onChange={(e) => setArtifactUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium">Deliverable Notes / Context</label>
            <input
              type="text"
              placeholder="e.g. Unit tests, documentation benchmark notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
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
              {deliverable ? 'Update Deliverable' : 'Create Deliverable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
