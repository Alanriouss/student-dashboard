import React, { useRef } from 'react'
import { GraduationCap, Download, Upload, RotateCcw, ShieldCheck, User, Cloud, Calendar, FileCheck } from 'lucide-react'
import type { AppData } from '../types'
import { exportAppDataJson, importAppDataJson, DEFAULT_APP_DATA, saveAppData } from '../services/storageService'

interface HeaderProps {
  activeTab: 'academic' | 'buffer' | 'calendar' | 'integrations'
  setActiveTab: (tab: 'academic' | 'buffer' | 'calendar' | 'integrations') => void
  appData: AppData
  onUpdateAppData: (data: AppData) => void
  onOpenCloudModal: () => void
  onOpenReportModal: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  appData,
  onUpdateAppData,
  onOpenCloudModal,
  onOpenReportModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    exportAppDataJson(appData)
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importAppDataJson(file)
      onUpdateAppData(imported)
      alert('Workspace backup successfully restored!')
    } catch (err: any) {
      alert(`Failed to import backup: ${err.message}`)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleReset = () => {
    if (confirm('Reset workspace to default sophomore Data Science courses and buffer tasks?')) {
      saveAppData(DEFAULT_APP_DATA)
      onUpdateAppData(DEFAULT_APP_DATA)
    }
  }

  const isCloudConnected = appData.cloudSync?.enabled

  return (
    <header className="border-b border-[#2D3834] bg-[#171E1C]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B8266] to-[#2D3834] flex items-center justify-center border border-[#5B8266]/30 shadow-lg shadow-[#131716]">
              <GraduationCap className="w-5 h-5 text-[#E0E6E4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#E0E6E4]">
                  Student Operations &amp; Academic Analytics Hub
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#5B8266]/20 text-[#8C9E96] border border-[#5B8266]/30 font-mono hidden sm:inline-block">
                  DS Undergrad v2.0
                </span>
              </div>
              <p className="text-xs text-[#8C9E96]">
                Target Grade Predictive Solver &bull; 72h Buffer &bull; Calendar Sync
              </p>
            </div>
          </div>

          {/* Quick Actions & User Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2220] border border-[#2D3834] text-xs text-[#8C9E96]">
              <User className="w-3.5 h-3.5 text-[#5B8266]" />
              <span>Owner: <strong className="text-[#E0E6E4] font-medium">{appData.currentUser}</strong></span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#5B8266] ml-1" />
            </div>

            {/* Cloud Sync Status Indicator */}
            <button
              onClick={onOpenCloudModal}
              title="Cloud Database & Supabase Sync"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                isCloudConnected
                  ? 'bg-[#18261F] border-[#5B9975]/40 text-[#5B9975]'
                  : 'bg-[#1B2220] hover:bg-[#232C2A] border-[#2D3834] text-[#8C9E96] hover:text-[#E0E6E4]'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isCloudConnected ? 'Cloud Active' : 'Cloud Sync'}</span>
            </button>

            {/* Academic Audit Report Generator */}
            <button
              onClick={onOpenReportModal}
              title="Generate Semester Academic & Milestone Audit Report"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2220] hover:bg-[#232C2A] border border-[#2D3834] text-xs text-[#E0E6E4] transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5 text-[#5B8266]" />
              <span className="hidden sm:inline">Audit Report</span>
            </button>

            <div className="h-4 w-[1px] bg-[#2D3834] hidden sm:block" />

            <button
              onClick={handleExport}
              title="Export workspace data as JSON backup"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2220] hover:bg-[#232C2A] border border-[#2D3834] hover:border-[#3A4742] text-xs text-[#E0E6E4] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#648381]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import JSON backup"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1B2220] hover:bg-[#232C2A] border border-[#2D3834] hover:border-[#3A4742] text-xs text-[#E0E6E4] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#648381]" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              onClick={handleReset}
              title="Reset to default DS sample data"
              className="p-1.5 rounded-lg bg-[#1B2220] hover:bg-[#232C2A] border border-[#2D3834] text-[#8C9E96] hover:text-[#E0E6E4] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 border-t border-[#2D3834] pt-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('academic')}
            className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'academic'
                ? 'border-[#5B8266] text-[#E0E6E4] bg-[#1B2220]/60'
                : 'border-transparent text-[#8C9E96] hover:text-[#E0E6E4] hover:border-[#2D3834]'
            }`}
          >
            <span>Academic Performance &amp; Target Solver</span>
            <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-[#131716] border border-[#2D3834] text-[#8C9E96]">
              {appData.courses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('buffer')}
            className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'buffer'
                ? 'border-[#5B8266] text-[#E0E6E4] bg-[#1B2220]/60'
                : 'border-transparent text-[#8C9E96] hover:text-[#E0E6E4] hover:border-[#2D3834]'
            }`}
          >
            <span>Milestone Buffer Table</span>
            <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-[#131716] border border-[#2D3834] text-[#8C9E96]">
              {appData.deliverables.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'calendar'
                ? 'border-[#5B8266] text-[#E0E6E4] bg-[#1B2220]/60'
                : 'border-transparent text-[#8C9E96] hover:text-[#E0E6E4] hover:border-[#2D3834]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#5B8266]" />
            <span>Academic Calendar &amp; Deadlines</span>
            <span className="text-xs font-mono px-1.5 py-0.2 rounded bg-[#131716] border border-[#2D3834] text-[#8C9E96]">
              {appData.calendarEvents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`py-2 px-3 text-xs sm:text-sm font-medium rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'integrations'
                ? 'border-[#5B8266] text-[#E0E6E4] bg-[#1B2220]/60'
                : 'border-transparent text-[#8C9E96] hover:text-[#E0E6E4] hover:border-[#2D3834]'
            }`}
          >
            <span>Hub Tooling &amp; Directory</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
