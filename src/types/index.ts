export type LetterGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D+' | 'D' | 'F'

export interface GradeScaleEntry {
  minScore: number
  maxScore: number
  letterGrade: LetterGrade
  gpa4: number
  classification: string
  status: 'Pass' | 'Fail'
}

export interface Course {
  id: string
  code: string
  title: string
  credits: number
  weightInClass: number // e.g., 0.20
  weightMidterm: number // e.g., 0.30
  weightFinal: number   // e.g., 0.50
  scoreInClass: number | null // 0-100
  scoreMidterm: number | null // 0-100
  scoreFinal: number | null   // 0-100
  targetGrade: LetterGrade
  semester?: string
  notes?: string
}

export type DeliverableStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DRAFT_READY' | 'APPROVED'

export interface Deliverable {
  id: string
  projectId: string
  taskName: string
  milestonePhase: string
  ownerName: string // Single DRI rule
  internalBufferDeadline: string // ISO date string
  officialDueDate: string        // ISO date string
  peerReviewer: string
  status: DeliverableStatus
  artifactUrl: string
  notes?: string
}

export interface Project {
  id: string
  name: string
  courseCode: string
  githubRepo: string // e.g. "owner/repo"
  description: string
}

export type QuickLinkCategory = 'ACADEMIC' | 'REPO' | 'DOCS' | 'TOOL'

export interface QuickLink {
  id: string
  category: QuickLinkCategory
  title: string
  url: string
  sortOrder: number
}

export interface GitHubCommit {
  sha: string
  message: string
  author: string
  date: string
  htmlUrl: string
}

export interface GitHubRepoInfo {
  repoName: string
  openPrCount: number
  recentCommits: GitHubCommit[]
  lastFetched: number
  isMock?: boolean
  error?: string
}

export type EventType = 'EXAM' | 'ASSIGNMENT' | 'MILESTONE' | 'LECTURE' | 'LAB' | 'STUDY_SESSION' | 'OTHER'

export interface CalendarEvent {
  id: string
  title: string
  courseCode?: string
  startDate: string // ISO string
  endDate?: string  // ISO string
  type: EventType
  location?: string
  description?: string
  isBufferConverted?: boolean
}

export interface ScheduleConflict {
  id: string
  eventA: CalendarEvent
  eventB: CalendarEvent
  date: string // YYYY-MM-DD
  conflictType: 'OVERLAP' | 'EXAM_CRUNCH'
  message: string
}

export interface BufferCongestion {
  date: string // YYYY-MM-DD
  count: number
  deliverables: Deliverable[]
  message: string
}

export interface CloudSyncConfig {
  enabled: boolean
  provider: 'supabase' | 'custom_rest' | 'google_sheets'
  endpointUrl: string
  apiKey?: string
  workspaceId: string
  lastSynced?: string
}

export type DiffStatus = 'NEW' | 'MODIFIED' | 'REMOVED'

export interface FieldDiff {
  field: string
  oldValue: any
  newValue: any
}

export interface DiffItem<T extends { id: string }> {
  id: string
  status: DiffStatus
  localItem?: T
  remoteItem?: T
  changedFields: FieldDiff[]
  description: string
}

export interface TableDiffResult<T extends { id: string }> {
  tableName: string
  items: DiffItem<T>[]
  newCount: number
  modifiedCount: number
  totalChanges: number
}

export interface AppData {
  version: string
  currentUser: string
  courses: Course[]
  projects: Project[]
  deliverables: Deliverable[]
  quickLinks: QuickLink[]
  calendarEvents: CalendarEvent[]
  cloudSync?: CloudSyncConfig
}
