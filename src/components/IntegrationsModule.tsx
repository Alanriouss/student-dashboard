import React, { useState, useEffect } from 'react'
import type { Project, QuickLink, GitHubRepoInfo } from '../types'
import { fetchGitHubRepoData } from '../services/githubService'
import { QuickLinkFormModal } from './QuickLinkFormModal'
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Bookmark,
  Calendar,
  Layers,
  Clock,
} from 'lucide-react'

interface IntegrationsModuleProps {
  projects: Project[]
  quickLinks: QuickLink[]
  onUpdateQuickLinks: (links: QuickLink[]) => void
}

export const IntegrationsModule: React.FC<IntegrationsModuleProps> = ({
  projects,
  quickLinks,
  onUpdateQuickLinks,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? '')
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [linkToEdit, setLinkToEdit] = useState<QuickLink | null>(null)
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0]

  const handleRefresh = async () => {
    if (!activeProject?.githubRepo) return
    setIsLoading(true)
    try {
      const data = await fetchGitHubRepoData(activeProject.githubRepo, true)
      setRepoInfo(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false
    const repo = activeProject?.githubRepo
    if (!repo) {
      queueMicrotask(() => {
        if (!isCancelled) setRepoInfo(null)
      })
      return
    }

    const loadData = async () => {
      setIsLoading(true)
      try {
        const data = await fetchGitHubRepoData(repo, false)
        if (!isCancelled) setRepoInfo(data)
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }
    void loadData()

    return () => {
      isCancelled = true
    }
  }, [activeProject?.githubRepo])

  const handleDeleteLink = (id: string) => {
    if (confirm('Delete this quick link?')) {
      onUpdateQuickLinks(quickLinks.filter((l) => l.id !== id))
    }
  }

  const handleSaveLink = (data: Omit<QuickLink, 'id'> & { id?: string }) => {
    if (data.id) {
      onUpdateQuickLinks(quickLinks.map((l) => (l.id === data.id ? ({ ...data, id: l.id } as QuickLink) : l)))
    } else {
      const newLink: QuickLink = {
        ...data,
        id: `ql-${Date.now()}`,
      }
      onUpdateQuickLinks([...quickLinks, newLink])
    }
  }

  const categories = ['ACADEMIC', 'DOCS', 'REPO', 'TOOL'] as const

  return (
    <section className="space-y-6" aria-labelledby="integrations-title">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#2D3834] gap-3">
        <div>
          <h2 id="integrations-title" className="text-lg font-semibold tracking-tight text-[#E0E6E4]">
            Hub Tooling, Repositories &amp; Directory
          </h2>
          <p className="text-xs text-[#8C9E96]">
            Configurable GitHub activity monitor, academic portal shortcuts, and calendar sync
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GitHub Activity Monitor (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-[#1B2220] border border-[#2D3834]">
            {/* Header & Project Repo Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#2D3834] gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#E0E6E4]">GitHub Activity Monitor</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#8C9E96]">Project:</span>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="px-2 py-0.5 rounded bg-[#131716] border border-[#2D3834] text-xs font-mono text-[#5B8266] outline-none"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.courseCode} ({p.githubRepo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  title="Force refresh GitHub data"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#131716] text-xs text-[#8C9E96] hover:text-[#E0E6E4] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#5B8266]' : ''}`} />
                  <span>Refresh</span>
                </button>
                <a
                  href={`https://github.com/${activeProject?.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border border-[#2D3834] hover:border-[#3A4742] bg-[#131716] text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
                  title="Open in GitHub"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Error or Rate Limit notice */}
            {repoInfo?.error && (
              <div className="my-3 p-3 rounded-lg bg-[#241A16] border border-[#997A5B]/40 text-xs text-[#B89674]">
                {repoInfo.error}
              </div>
            )}

            {/* Repo Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-xl bg-[#131716] border border-[#2D3834]">
                <div className="text-[10px] text-[#8C9E96] uppercase tracking-wider font-mono">Repository</div>
                <div className="text-xs font-mono font-medium text-[#E0E6E4] truncate mt-1">
                  {activeProject?.githubRepo || 'None'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#131716] border border-[#2D3834]">
                <div className="text-[10px] text-[#8C9E96] uppercase tracking-wider font-mono flex items-center gap-1">
                  <GitPullRequest className="w-3 h-3 text-[#648381]" />
                  <span>Open Pull Requests</span>
                </div>
                <div className="text-xl font-mono font-bold text-[#E0E6E4] mt-0.5">
                  {repoInfo?.openPrCount ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#131716] border border-[#2D3834] col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[#8C9E96] uppercase tracking-wider font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#5B8266]" />
                  <span>Cache Status</span>
                </div>
                <div className="text-xs text-[#8C9E96] mt-1 font-mono">
                  {repoInfo?.isMock ? 'Mock Fallback' : 'Cached (5m TTL)'}
                </div>
              </div>
            </div>

            {/* Recent Commits List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#E0E6E4] flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-[#5B8266]" />
                  Recent Commits (Active Branch)
                </span>
                <span className="text-[10px] font-mono text-[#8C9E96]">Last 3 Commits</span>
              </div>

              <div className="space-y-2">
                {repoInfo?.recentCommits && repoInfo.recentCommits.length > 0 ? (
                  repoInfo.recentCommits.map((c) => (
                    <div
                      key={c.sha}
                      className="p-3 rounded-xl bg-[#131716] border border-[#2D3834] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:border-[#3A4742] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <a
                            href={c.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-[#5B8266] hover:underline"
                          >
                            {c.sha}
                          </a>
                          <span className="text-xs text-[#E0E6E4] font-medium line-clamp-1">
                            {c.message}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#8C9E96] flex items-center gap-2">
                          <span>by <strong className="text-[#E0E6E4]">{c.author}</strong></span>
                          <span>&bull;</span>
                          <span>{new Date(c.date).toLocaleDateString()} {new Date(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <a
                        href={c.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="self-end sm:self-center text-xs text-[#648381] hover:text-[#E0E6E4] p-1 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-[#131716] text-center text-xs text-[#8C9E96]">
                    {isLoading ? 'Fetching repository commits...' : 'No commits found.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Academic Calendar strip (Phase 3 integration notice) */}
          <div className="p-4 rounded-2xl bg-[#1B2220] border border-[#2D3834] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#648381]/20 border border-[#648381]/30 text-[#648381]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[#E0E6E4]">Google Calendar Sync (API v3)</h4>
                <p className="text-[11px] text-[#8C9E96]">
                  Phase 3 Roadmap: Link university Google Calendar to pull exam schedules directly into the 72h buffer strip.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131716] border border-[#2D3834] text-[#8C9E96]">
              Roadmap Active
            </span>
          </div>
        </div>

        {/* Quick Links Directory (1 column) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#1B2220] border border-[#2D3834]">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D3834]">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-[#5B8266]" />
                <h3 className="text-sm font-semibold text-[#E0E6E4]">Quick Links Directory</h3>
              </div>
              <button
                onClick={() => setIsAddLinkOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-[11px] font-medium text-[#E0E6E4] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-4 mt-3">
              {categories.map((cat) => {
                const linksInCat = quickLinks.filter((l) => l.category === cat)
                if (linksInCat.length === 0) return null

                return (
                  <div key={cat} className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8C9E96] font-semibold flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#648381]" />
                      {cat}
                    </span>
                    <div className="space-y-1">
                      {linksInCat.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#131716] border border-[#2D3834] hover:border-[#3A4742] group transition-colors"
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#E0E6E4] group-hover:text-[#5B8266] font-medium truncate flex items-center gap-1.5 flex-1"
                          >
                            <span>{link.title}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setLinkToEdit(link)}
                              className="p-1 text-[#8C9E96] hover:text-[#E0E6E4]"
                              title="Edit link"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.id)}
                              className="p-1 text-[#8C9E96] hover:text-[#A36262]"
                              title="Delete link"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Quick Link Modal */}
      {(isAddLinkOpen || linkToEdit) && (
        <QuickLinkFormModal
          link={linkToEdit}
          isOpen={true}
          onClose={() => {
            setIsAddLinkOpen(false)
            setLinkToEdit(null)
          }}
          onSave={handleSaveLink}
        />
      )}
    </section>
  )
}
