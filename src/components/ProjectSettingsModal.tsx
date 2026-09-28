import React, { useState } from 'react'
import type { Project } from '../types'
import { X, GitBranch, Settings, Plus, Trash2 } from 'lucide-react'

interface ProjectSettingsModalProps {
  projects: Project[]
  isOpen: boolean
  onClose: () => void
  onUpdateProjects: (projects: Project[]) => void
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  projects,
  isOpen,
  onClose,
  onUpdateProjects,
}) => {
  const [projectList, setProjectList] = useState<Project[]>(projects)
  const [newProjectName, setNewProjectName] = useState('')
  const [newCourseCode, setNewCourseCode] = useState('')
  const [newGithubRepo, setNewGithubRepo] = useState('')

  if (!isOpen) return null

  const handleUpdateField = (id: string, field: keyof Project, value: string) => {
    setProjectList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    )
  }

  const handleDelete = (id: string) => {
    if (projectList.length <= 1) {
      alert('You must have at least one project.')
      return
    }
    if (confirm('Delete this project? Associated deliverables will remain.')) {
      setProjectList((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleAddNewProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    const newProject: Project = {
      id: `p-${Date.now()}`,
      name: newProjectName.trim(),
      courseCode: newCourseCode.trim().toUpperCase() || 'DS200',
      githubRepo: newGithubRepo.trim() || 'facebook/react',
      description: 'Project deliverable stream',
    }

    setProjectList([...projectList, newProject])
    setNewProjectName('')
    setNewCourseCode('')
    setNewGithubRepo('')
  }

  const handleSaveAll = () => {
    onUpdateProjects(projectList)
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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E0E6E4]">Project &amp; GitHub Settings</h3>
              <p className="text-xs text-[#8C9E96]">
                Configure linked repositories and project metadata
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

        {/* Existing Projects List */}
        <div className="space-y-4 my-4">
          <label className="text-xs font-semibold text-[#E0E6E4] uppercase tracking-wider font-mono block">
            Configured Project Boards ({projectList.length})
          </label>
          {projectList.map((project) => (
            <div key={project.id} className="p-3.5 rounded-xl bg-[#1B2220] border border-[#2D3834] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#E0E6E4] font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#131716] border border-[#2D3834] text-[#5B8266]">
                  {project.courseCode}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(project.id)}
                  className="text-[#8C9E96] hover:text-[#A36262] p-1 rounded transition-colors"
                  title="Remove project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] text-[#8C9E96] mb-1">Project Name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => handleUpdateField(project.id, 'name', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#8C9E96] mb-1 flex items-center gap-1">
                  <GitBranch className="w-3 h-3 text-[#5B8266]" />
                  <span>Linked GitHub Repository (owner/repo)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. facebook/react"
                  value={project.githubRepo}
                  onChange={(e) => handleUpdateField(project.id, 'githubRepo', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Project Section */}
        <form onSubmit={handleAddNewProject} className="p-3.5 rounded-xl bg-[#131716] border border-[#2D3834] space-y-3 text-xs mb-4">
          <span className="font-medium text-[#E0E6E4] block">Add New Project Board</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input
                type="text"
                placeholder="Code (e.g. STAT200)"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#1B2220] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-xs"
              />
            </div>
            <div className="col-span-2">
              <input
                type="text"
                placeholder="Project Title"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#1B2220] border border-[#2D3834] text-[#E0E6E4] outline-none text-xs"
              />
            </div>
          </div>
          <div>
            <input
              type="text"
              placeholder="GitHub repo (e.g. username/repo-name)"
              value={newGithubRepo}
              onChange={(e) => setNewGithubRepo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#1B2220] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none text-xs"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#1B2220] hover:bg-[#232C2A] border border-[#2D3834] text-[#5B8266] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project to Workspace</span>
          </button>
        </form>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D3834]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-xs text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-xs text-[#E0E6E4] font-medium transition-colors"
          >
            Save Project Settings
          </button>
        </div>
      </div>
    </div>
  )
}
