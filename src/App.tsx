import { useState, useEffect } from 'react'
import type { AppData, CalendarEvent, CloudSyncConfig, Course, Deliverable, Project, QuickLink } from './types'
import { loadAppData, saveAppData } from './services/storageService'
import { Header } from './components/Header'
import { KpiStrip } from './components/KpiStrip'
import { AcademicModule } from './components/AcademicModule'
import { BufferTableModule } from './components/BufferTableModule'
import { CalendarModule } from './components/CalendarModule'
import { IntegrationsModule } from './components/IntegrationsModule'
import { TeammateView } from './components/TeammateView'
import { GpaOptimizerModal } from './components/GpaOptimizerModal'
import { CloudSyncModal } from './components/CloudSyncModal'
import { AcademicReportModal } from './components/AcademicReportModal'
import { SyncDiffModal } from './components/SyncDiffModal'

export default function App() {
  const [appData, setAppData] = useState<AppData>(loadAppData)
  const [activeTab, setActiveTab] = useState<'academic' | 'buffer' | 'calendar' | 'integrations'>('academic')
  const [currentHash, setCurrentHash] = useState<string>(window.location.hash)

  const [isGpaOptimizerOpen, setIsGpaOptimizerOpen] = useState(false)
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [diffModalState, setDiffModalState] = useState<{
    isOpen: boolean
    remoteData: Partial<AppData>
    providerName: string
  } | null>(null)

  // Listen to hash changes for deep linking (e.g. #/project/:id/view)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Auto-save state changes to localStorage
  const handleUpdateAppData = (newAppData: AppData) => {
    setAppData(newAppData)
    saveAppData(newAppData)
  }

  const handleUpdateCourses = (courses: Course[]) => {
    const updated: AppData = { ...appData, courses }
    handleUpdateAppData(updated)
  }

  const handleUpdateDeliverables = (deliverables: Deliverable[]) => {
    const updated: AppData = { ...appData, deliverables }
    handleUpdateAppData(updated)
  }

  const handleAddDeliverable = (deliverable: Deliverable) => {
    const updated: AppData = {
      ...appData,
      deliverables: [...appData.deliverables, deliverable],
    }
    handleUpdateAppData(updated)
  }

  const handleUpdateProjects = (projects: Project[]) => {
    const updated: AppData = { ...appData, projects }
    handleUpdateAppData(updated)
  }

  const handleUpdateQuickLinks = (quickLinks: QuickLink[]) => {
    const updated: AppData = { ...appData, quickLinks }
    handleUpdateAppData(updated)
  }

  const handleUpdateCalendarEvents = (calendarEvents: CalendarEvent[]) => {
    const updated: AppData = { ...appData, calendarEvents }
    handleUpdateAppData(updated)
  }

  const handleSaveCloudConfig = (cloudSync: CloudSyncConfig) => {
    const updated: AppData = { ...appData, cloudSync }
    handleUpdateAppData(updated)
  }

  const handleApplyDiffMerge = (merged: {
    deliverables?: Deliverable[]
    courses?: Course[]
    calendarEvents?: CalendarEvent[]
  }) => {
    const updated: AppData = {
      ...appData,
      deliverables: merged.deliverables ?? appData.deliverables,
      courses: merged.courses ?? appData.courses,
      calendarEvents: merged.calendarEvents ?? appData.calendarEvents,
      cloudSync: appData.cloudSync
        ? { ...appData.cloudSync, lastSynced: new Date().toISOString() }
        : undefined,
    }
    handleUpdateAppData(updated)
    setDiffModalState(null)
  }

  // Check if hash matches /project/:id/view
  const teammateMatch = currentHash.match(/#\/project\/([^/]+)\/view/)
  if (teammateMatch && teammateMatch[1]) {
    const projectId = teammateMatch[1]
    return (
      <TeammateView
        projectId={projectId}
        appData={appData}
        onBackToAdmin={() => {
          window.location.hash = ''
          setCurrentHash('')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#131716] text-[#E0E6E4] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appData={appData}
        onUpdateAppData={handleUpdateAppData}
        onOpenCloudModal={() => setIsCloudSyncOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-time KPI Bar */}
        <KpiStrip
          courses={appData.courses}
          deliverables={appData.deliverables}
          calendarEvents={appData.calendarEvents}
          onSelectBufferTab={() => setActiveTab('buffer')}
        />

        {/* Dynamic View Panels */}
        {activeTab === 'academic' && (
          <AcademicModule
            courses={appData.courses}
            onUpdateCourses={handleUpdateCourses}
            onOpenGpaOptimizer={() => setIsGpaOptimizerOpen(true)}
          />
        )}

        {activeTab === 'buffer' && (
          <BufferTableModule
            deliverables={appData.deliverables}
            projects={appData.projects}
            currentUser={appData.currentUser}
            cloudSyncConfig={appData.cloudSync}
            onUpdateDeliverables={handleUpdateDeliverables}
            onUpdateProjects={handleUpdateProjects}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarModule
            calendarEvents={appData.calendarEvents}
            projects={appData.projects}
            courses={appData.courses}
            deliverables={appData.deliverables}
            currentUser={appData.currentUser}
            onUpdateCalendarEvents={handleUpdateCalendarEvents}
            onAddDeliverable={handleAddDeliverable}
            onSelectBufferTab={() => setActiveTab('buffer')}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsModule
            projects={appData.projects}
            quickLinks={appData.quickLinks}
            onUpdateQuickLinks={handleUpdateQuickLinks}
            onUpdateProjects={handleUpdateProjects}
          />
        )}
      </main>

      {/* Phase 3: Academic & Milestone Audit Report Modal */}
      {isReportModalOpen && (
        <AcademicReportModal
          isOpen={true}
          onClose={() => setIsReportModalOpen(false)}
          courses={appData.courses}
          deliverables={appData.deliverables}
          projects={appData.projects}
          currentUser={appData.currentUser}
        />
      )}

      {/* Phase 2: Semester Macro Target GPA Optimizer Modal */}
      {isGpaOptimizerOpen && (
        <GpaOptimizerModal
          courses={appData.courses}
          isOpen={true}
          onClose={() => setIsGpaOptimizerOpen(false)}
          onApplyPlan={handleUpdateCourses}
        />
      )}

      {/* Cloud Sync & Google Sheets Live Modal */}
      {isCloudSyncOpen && (
        <CloudSyncModal
          appData={appData}
          config={appData.cloudSync || {
            enabled: false,
            provider: 'google_sheets',
            endpointUrl: '',
            apiKey: '',
            workspaceId: 'ds-fall2026-hub',
          }}
          isOpen={true}
          onClose={() => setIsCloudSyncOpen(false)}
          onSaveConfig={handleSaveCloudConfig}
          onOpenDiffReview={(remoteData, providerName) =>
            setDiffModalState({ isOpen: true, remoteData, providerName })
          }
        />
      )}

      {/* Two-Way Visual Diff & Cherry-pick Modal */}
      {diffModalState?.isOpen && (
        <SyncDiffModal
          isOpen={true}
          onClose={() => setDiffModalState(null)}
          providerName={diffModalState.providerName}
          localData={appData}
          remoteData={diffModalState.remoteData}
          onApplyMerge={handleApplyDiffMerge}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#2D3834] bg-[#171E1C] py-4 text-xs text-[#8C9E96]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>Student Operations &amp; Academic Analytics Hub</span>
            <span className="mx-2">&bull;</span>
            <span className="font-mono">Phase 2: Calendar Sync &amp; Macro GPA Optimizer</span>
          </div>
          <div className="font-mono text-[11px] text-[#5B8266]">
            Target Grade Solver &bull; 72h Safety Buffer &bull; Supabase Ready
          </div>
        </div>
      </footer>
    </div>
  )
}
