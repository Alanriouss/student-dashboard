import type { Deliverable } from '../types'

export type BufferUrgency = 'COMPLETED' | 'OVERDUE' | 'CRITICAL_24H' | 'WARNING_72H' | 'ON_TRACK'

export function computeDefaultBufferDate(officialDueDateIso: string, bufferHours = 72): string {
  try {
    const due = new Date(officialDueDateIso)
    if (isNaN(due.getTime())) {
      const now = new Date()
      now.setDate(now.getDate() + 7)
      return now.toISOString()
    }
    const bufferTime = new Date(due.getTime() - bufferHours * 60 * 60 * 1000)
    return bufferTime.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function getBufferUrgency(deliverable: Deliverable): {
  urgency: BufferUrgency
  hoursRemaining: number
  label: string
  isApproachingBuffer: boolean
} {
  if (deliverable.status === 'APPROVED') {
    return {
      urgency: 'COMPLETED',
      hoursRemaining: 99999,
      label: 'Signed Off',
      isApproachingBuffer: false,
    }
  }

  const now = new Date().getTime()
  const bufferDate = new Date(deliverable.internalBufferDeadline).getTime()
  const diffMs = bufferDate - now
  const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60))

  if (hoursRemaining < 0) {
    const hoursOverdue = Math.abs(hoursRemaining)
    const daysOverdue = Math.floor(hoursOverdue / 24)
    return {
      urgency: 'OVERDUE',
      hoursRemaining,
      label: daysOverdue > 0 ? `Buffer breached (${daysOverdue}d ago)` : `Buffer breached (${hoursOverdue}h ago)`,
      isApproachingBuffer: true,
    }
  }

  if (hoursRemaining <= 24) {
    return {
      urgency: 'CRITICAL_24H',
      hoursRemaining,
      label: `Buffer in ${hoursRemaining}h (<24h)`,
      isApproachingBuffer: true,
    }
  }

  if (hoursRemaining <= 72) {
    const days = Math.ceil(hoursRemaining / 24)
    return {
      urgency: 'WARNING_72H',
      hoursRemaining,
      label: `Buffer in ${days}d (${hoursRemaining}h)`,
      isApproachingBuffer: true,
    }
  }

  const daysRemaining = Math.floor(hoursRemaining / 24)
  return {
    urgency: 'ON_TRACK',
    hoursRemaining,
    label: `${daysRemaining} days left to buffer`,
    isApproachingBuffer: false,
  }
}

export function formatDateShort(dateIso: string): string {
  try {
    const d = new Date(dateIso)
    if (isNaN(d.getTime())) return dateIso
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateIso
  }
}

export function formatDateDayOnly(dateIso: string): string {
  try {
    const d = new Date(dateIso)
    if (isNaN(d.getTime())) return dateIso
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateIso
  }
}

export function validateSingleDRI(ownerName: string): { isValid: boolean; error?: string } {
  const trimmed = ownerName.trim()
  if (!trimmed) {
    return { isValid: false, error: 'A single owner (DRI) is strictly required.' }
  }
  if (trimmed.includes('&') || trimmed.toLowerCase().includes(' and ') || trimmed.includes(',')) {
    return {
      isValid: false,
      error: 'Single-Threaded Ownership Rule: Multi-owner rows ("Alex & Liam") are forbidden. Choose strictly one DRI.',
    }
  }
  return { isValid: true }
}

export function canApproveDeliverable(deliverable: Deliverable): { canApprove: boolean; reason?: string } {
  if (!deliverable.peerReviewer || !deliverable.peerReviewer.trim()) {
    return {
      canApprove: false,
      reason: 'A Peer Reviewer must be assigned before a deliverable can be marked as APPROVED.',
    }
  }
  if (deliverable.peerReviewer.trim().toLowerCase() === deliverable.ownerName.trim().toLowerCase()) {
    return {
      canApprove: false,
      reason: 'Self-approval is forbidden: The Peer Reviewer must be different from the DRI owner.',
    }
  }
  return { canApprove: true }
}
