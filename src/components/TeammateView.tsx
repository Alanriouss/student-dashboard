import React, { useState, useEffect, useCallback } from 'react'
import type { AppData, Deliverable } from '../types'
import { getBufferUrgency, formatDateShort, formatDateDayOnly } from '../utils/bufferEngine'
import { fetchRemoteSnapshot } from '../services/cloudSyncService'
import {
  Users,
  Shield,
  ExternalLink,
  AlertTriangle,
  ArrowLeft,
  GitBranch,
  CheckCircle2,
  RefreshCw,
  Clock,
} from 'lucide-react'

interface TeammateViewProps {
  projectId: string
  appData: AppData
  onBackToAdmin: () => void
}

export const TeammateView: React.FC<TeammateViewProps> = ({ projectId, appData, onBackToAdmin }) => {
  const project = appData.projects.find((p) => p.id === projectId) ?? appData.projects[0]
  const [deliverables, setDeliverables] = useState<Deliverable[]>(() =>
    appData.deliverables.filter((d) => d.projectId === project?.id)
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('Local Cache')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  // Extract ?sync= endpoint from URL hash or query if present
  const getEndpoint = useCallback((): string | null => {
    try {
      const hashParts = window.location.hash.split('?')
      if (hashParts[1]) {
        const hashParams = new URLSearchParams(hashParts[1])
        const syncUrl = hashParams.get('sync')
        if (syncUrl) return decodeURIComponent(syncUrl)
      }
      const searchParams = new URLSearchParams(window.location.search)
      const syncUrl = searchParams.get('sync')
      if (syncUrl) return decodeURIComponent(syncUrl)
    } catch {
      // Ignore URL parsing errors
    }
    return appData.cloudSync?.enabled && appData.cloudSync.endpointUrl ? appData.cloudSync.endpointUrl : null
  }, [appData.cloudSync])

  const refreshFromRemote = useCallback(async () => {
    const endpoint = getEndpoint()
    if (!endpoint) return

    setIsSyncing(true)
    try {
      const res = await fetchRemoteSnapshot({
        enabled: true,
        provider: 'google_sheets',
        endpointUrl: endpoint,
        workspaceId: appData.cloudSync?.workspaceId || 'default-workspace',
      })

      if (res.success && res.data?.deliverables) {
        const allDeliverables = res.data.deliverables as Deliverable[]
        const projectOnly = allDeliverables.filter((d) => d.projectId === project?.id)
        if (projectOnly.length > 0) {
          setDeliverables(projectOnly)
          setSyncStatus('Live Google Sheets')
          setLastSyncTime(new Date().toLocaleTimeString())
        }
      }
    } catch {
      setSyncStatus('Local Snapshot (Offline)')
    } finally {
      setIsSyncing(false)
    }
  }, [getEndpoint, project?.id, appData.cloudSync])

  // Initial fetch on mount if sync endpoint exists
  useEffect(() => {
    let ignore = false
    const endpoint = getEndpoint()
    if (!endpoint) return

    // Trigger async fetch without synchronous setState warning
    const timer = setTimeout(() => {
      setIsSyncing(true)
      fetchRemoteSnapshot({
        enabled: true,
        provider: 'google_sheets',
        endpointUrl: endpoint,
        workspaceId: appData.cloudSync?.workspaceId || 'default-workspace',
      })
        .then((res) => {
          if (!ignore && res.success && res.data?.deliverables) {
            const allDeliverables = res.data.deliverables as Deliverable[]
            const projectOnly = allDeliverables.filter((d) => d.projectId === project?.id)
            if (projectOnly.length > 0) {
              setDeliverables(projectOnly)
              setSyncStatus('Live Google Sheets')
              setLastSyncTime(new Date().toLocaleTimeString())
            }
          }
        })
        .catch(() => {
          if (!ignore) {
            setSyncStatus('Local Snapshot (Offline)')
          }
        })
        .finally(() => {
          if (!ignore) {
            setIsSyncing(false)
          }
        })
    }, 0)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [getEndpoint, project?.id, appData.cloudSync])

  const approvedCount = deliverables.filter((d) => d.status === 'APPROVED').length
  const totalCount = deliverables.length
  const progressPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-[#131716] text-[#E0E6E4] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation / Switcher Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2D3834] flex-wrap gap-2">
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 text-xs text-[#8C9E96] hover:text-[#E0E6E4] px-3 py-1.5 rounded-lg bg-[#1B2220] border border-[#2D3834] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Workspace Admin View</span>
          </button>

          <div className="flex items-center gap-2">
            {getEndpoint() && (
              <button
                onClick={refreshFromRemote}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B2220] border border-[#2D3834] hover:border-[#3A4742] text-xs font-mono text-[#8C9E96] hover:text-[#E0E6E4] transition-colors disabled:opacity-50"
                title="Fetch latest updates from Google Sheets"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-[#5B8266]' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Refresh'}</span>
                {lastSyncTime && <span className="text-[10px] text-[#5B8266]">({lastSyncTime})</span>}
              </button>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B2220] border border-[#2D3834] text-xs font-mono text-[#8C9E96]">
              <Shield className="w-3.5 h-3.5 text-[#5B8266]" />
              <span>{syncStatus} &bull; Read-Only</span>
            </div>
          </div>
        </div>

        {/* Project Header Banner */}
        <div className="p-6 rounded-2xl bg-[#1B2220] border border-[#2D3834] relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded bg-[#131716] border border-[#2D3834] text-xs font-mono font-semibold text-[#5B8266]">
                  {project?.courseCode}
                </span>
                <span className="text-xs text-[#8C9E96] font-mono">Team Deliverable Stream</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#E0E6E4]">
                {project?.name}
              </h1>
              <p className="text-xs text-[#8C9E96] mt-1 max-w-2xl">
                {project?.description}
              </p>
            </div>

            {project?.githubRepo && (
              <a
                href={`https://github.com/${project.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#131716] border border-[#2D3834] hover:border-[#3A4742] text-xs text-[#E0E6E4] font-mono transition-colors self-start sm:self-auto"
              >
                <GitBranch className="w-4 h-4 text-[#5B8266]" />
                <span>{project.githubRepo}</span>
                <ExternalLink className="w-3 h-3 text-[#8C9E96]" />
              </a>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-5 pt-4 border-t border-[#2D3834] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#5B9975]" />
              <span>
                Project Deliverables Approved: <strong>{approvedCount}</strong> of <strong>{totalCount}</strong> ({progressPct}%)
              </span>
            </div>
            <div className="w-full sm:w-64 bg-[#131716] h-2.5 rounded-full overflow-hidden border border-[#2D3834]">
              <div
                className="bg-[#5B8266] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deliverables Table (Read-Only) */}
        <div className="rounded-2xl border border-[#2D3834] bg-[#171E1C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#2D3834] bg-[#1B2220] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5B8266]" />
              <h3 className="text-sm font-semibold text-[#E0E6E4]">Milestone Buffer Schedule</h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8C9E96]">
              <Clock className="w-3.5 h-3.5 text-[#B89674]" />
              <span>Internal 72h Safety Deadlines</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2D3834] bg-[#131716] text-[#8C9E96] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Deliverable</th>
                  <th className="py-3 px-3">Milestone Phase</th>
                  <th className="py-3 px-3">Owner (DRI)</th>
                  <th className="py-3 px-3">Internal Buffer (Safety)</th>
                  <th className="py-3 px-3">Official Due</th>
                  <th className="py-3 px-3">Peer Reviewer</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Proof Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D3834]/60">
                {deliverables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#8C9E96] text-xs">
                      No deliverables active for this project board.
                    </td>
                  </tr>
                ) : (
                  deliverables.map((del) => {
                    const urgency = getBufferUrgency(del)

                    return (
                      <tr key={del.id} className="hover:bg-[#1B2220]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#E0E6E4]">{del.taskName}</div>
                          {del.notes && <div className="text-[10px] text-[#8C9E96] mt-0.5">{del.notes}</div>}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[#131716] border border-[#2D3834] font-mono text-[#8C9E96]">
                            {del.milestonePhase}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-medium text-[#E0E6E4]">
                          {del.ownerName}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono">
                          <div className="text-[#E0E6E4] font-medium text-[11px]">
                            {formatDateShort(del.internalBufferDeadline)}
                          </div>
                          <div className="text-[10px] mt-0.5">
                            {urgency.urgency === 'COMPLETED' ? (
                              <span className="text-[#5B9975]">Signed Off</span>
                            ) : urgency.urgency === 'OVERDUE' ? (
                              <span className="text-[#A36262] font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {urgency.label}
                              </span>
                            ) : urgency.urgency === 'CRITICAL_24H' ? (
                              <span className="text-[#B89674] font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-[#997A5B]" /> {urgency.label}
                              </span>
                            ) : (
                              <span className="text-[#8C9E96]">{urgency.label}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[#8C9E96]">
                          {formatDateDayOnly(del.officialDueDate)}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap text-[#E0E6E4]">
                          {del.peerReviewer || <span className="text-[#A36262] italic text-[11px]">Unassigned</span>}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border ${
                              del.status === 'APPROVED'
                                ? 'bg-[#18261F] border-[#5B9975]/40 text-[#5B9975]'
                                : del.status === 'DRAFT_READY'
                                ? 'bg-[#1B2220] border-[#648381]/50 text-[#648381]'
                                : del.status === 'IN_PROGRESS'
                                ? 'bg-[#1F241C] border-[#5B8266]/50 text-[#5B8266]'
                                : 'bg-[#1B1B1B] border-[#2D3834] text-[#8C9E96]'
                            }`}
                          >
                            {del.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {del.artifactUrl ? (
                            <a
                              href={del.artifactUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#648381] hover:text-[#E0E6E4] flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Proof</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-[#8C9E96] italic">None</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
