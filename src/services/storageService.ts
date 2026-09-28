import type { AppData } from '../types'
import { SAMPLE_CALENDAR_EVENTS } from '../utils/calendarEngine'

const STORAGE_KEY = 'student_hub_app_data_v1'

export const DEFAULT_APP_DATA: AppData = {
  version: '1.0.0',
  currentUser: 'Alan (Lead)',
  courses: [
    {
      id: 'c-dsa201',
      code: 'DSA201',
      title: 'Data Structures & Algorithms',
      credits: 4,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 88,
      scoreMidterm: 82,
      scoreFinal: null,
      targetGrade: 'A+',
      semester: 'Fall 2026',
      notes: `# DSA201: Data Structures & Algorithms

## Complexity Quick Reference
| Data Structure | Search | Insert | Delete | Space |
| :--- | :--- | :--- | :--- | :--- |
| Hash Table | O(1) avg / O(n) | O(1) avg | O(1) avg | O(n) |
| AVL Tree | O(log n) | O(log n) | O(log n) | O(n) |
| Red-Black Tree | O(log n) | O(log n) | O(log n) | O(n) |

## Key Graph Traversals
- **Dijkstra:** Min-heap priority queue, non-negative edge weights $O((V+E) \\log V)$.
- **Bellman-Ford:** Detects negative cycles $O(V \\cdot E)$.
- **Floyd-Warshall:** All-pairs shortest path $O(V^3)$.`,
    },
    {
      id: 'c-pdm102',
      code: 'PDM102',
      title: 'Python Data Manipulation',
      credits: 3,
      weightInClass: 0.25,
      weightMidterm: 0.25,
      weightFinal: 0.50,
      scoreInClass: 92,
      scoreMidterm: 86,
      scoreFinal: null,
      targetGrade: 'A',
      semester: 'Fall 2026',
      notes: `# PDM102: Python Data Manipulation

## Polars vs Pandas Memory Architecture
- **Apache Arrow:** Zero-copy data sharing in memory via column-oriented memory layouts.
- **Lazy Execution:** \`.lazy().filter(...).select(...).collect()\` enables predicate pushdown and query optimization.

## Vectorization Rules
- Avoid \`.iterrows()\` or python-level loops.
- Use SIMD-accelerated array operations.`,
    },
    {
      id: 'c-math204',
      code: 'MATH204',
      title: 'Probability & Statistics for Data Science',
      credits: 3,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 78,
      scoreMidterm: 74,
      scoreFinal: null,
      targetGrade: 'B+',
      semester: 'Fall 2026',
      notes: `# MATH204: Probability & Statistics

## Essential Formulas
$$P(A|B) = \\frac{P(B|A) \\cdot P(A)}{P(B)}$$

### Continuous Probability Density Functions
- **Normal Distribution:**
$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$$
- **Central Limit Theorem (CLT):**
As $n \\to \\infty$, sample mean $\\bar{X}_n \\sim \\mathcal{N}\\left(\\mu, \\frac{\\sigma^2}{n}\\right)$.`,
    },
    {
      id: 'c-dbms301',
      code: 'DBMS301',
      title: 'Database Management Systems',
      credits: 3,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 85,
      scoreMidterm: 80,
      scoreFinal: 88,
      targetGrade: 'A',
      semester: 'Fall 2026',
      notes: `# DBMS301: Database Management Systems

## Normal Forms
- **1NF:** Atomic attribute values, no repeating groups.
- **2NF:** 1NF + no partial functional dependencies on candidate key.
- **3NF:** 2NF + no transitive dependencies ($X \\to Y \\implies X$ is superkey or $Y$ is prime).
- **BCNF:** For every $X \\to Y$, $X$ must be a superkey.

## Indexing
- B+ Tree indexing for range queries ($O(\\log_B N)$ height).`,
    },
    {
      id: 'c-cs101',
      code: 'CS101',
      title: 'Introduction to Computer Science & Programming',
      credits: 4,
      weightInClass: 0.20,
      weightMidterm: 0.30,
      weightFinal: 0.50,
      scoreInClass: 94,
      scoreMidterm: 91,
      scoreFinal: 95,
      targetGrade: 'A+',
      semester: 'Spring 2026',
      notes: `# CS101: Intro to Computer Science\n\nFoundational Python programming, control flow, recursion, and object-oriented programming.`,
    },
    {
      id: 'c-math101',
      code: 'MATH101',
      title: 'Linear Algebra for Machine Learning',
      credits: 3,
      weightInClass: 0.25,
      weightMidterm: 0.25,
      weightFinal: 0.50,
      scoreInClass: 89,
      scoreMidterm: 86,
      scoreFinal: 88,
      targetGrade: 'A',
      semester: 'Spring 2026',
      notes: `# MATH101: Linear Algebra\n\nEigenvalues, eigenvectors, SVD, and matrix decompositions for dimensionality reduction.`,
    },
  ],
  projects: [
    {
      id: 'p-dsa',
      name: 'Data Structures & Algorithms Implementation',
      courseCode: 'DSA201',
      githubRepo: 'facebook/react',
      description: 'Balanced trees, graph pathfinders, and benchmark performance comparison report',
    },
    {
      id: 'p-pdm',
      name: 'High-Throughput Data Pipeline',
      courseCode: 'PDM102',
      githubRepo: 'pola-rs/polars',
      description: 'Data ingestion, cleaning, and transformation microservice',
    },
  ],
  deliverables: [
    {
      id: 'del-1',
      projectId: 'p-dsa',
      taskName: 'Balanced BST Module (Red-Black & AVL)',
      milestonePhase: 'Phase 2 (Midterm)',
      ownerName: 'Alex',
      internalBufferDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      officialDueDate: new Date(Date.now() + 120 * 3600 * 1000).toISOString(),
      peerReviewer: 'Dung',
      status: 'APPROVED',
      artifactUrl: 'https://github.com/facebook/react/pull/1',
      notes: 'Unit tests passed with 98% branch coverage.',
    },
    {
      id: 'del-2',
      projectId: 'p-dsa',
      taskName: 'Graph Benchmark & Cache Profiler',
      milestonePhase: 'Phase 2 (Midterm)',
      ownerName: 'Liam',
      internalBufferDeadline: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      officialDueDate: new Date(Date.now() + 92 * 3600 * 1000).toISOString(),
      peerReviewer: 'Sarah',
      status: 'IN_PROGRESS',
      artifactUrl: 'https://github.com/facebook/react',
      notes: 'Dijkstra and A* algorithm execution speed compared.',
    },
    {
      id: 'del-3',
      projectId: 'p-dsa',
      taskName: 'Report Section 3: Empirical Complexity Analysis',
      milestonePhase: 'Phase 2 (Midterm)',
      ownerName: 'Alan (Lead)',
      internalBufferDeadline: new Date(Date.now() + 14 * 3600 * 1000).toISOString(),
      officialDueDate: new Date(Date.now() + 86 * 3600 * 1000).toISOString(),
      peerReviewer: 'Liam',
      status: 'NOT_STARTED',
      artifactUrl: 'https://docs.google.com/document/d/sample',
      notes: 'Buffer deadline in 14 hours! Writing asymptotic runtime breakdown.',
    },
    {
      id: 'del-4',
      projectId: 'p-pdm',
      taskName: 'Data Preprocessing Pipeline with Polars',
      milestonePhase: 'Phase 1: Ingestion',
      ownerName: 'Alan (Lead)',
      internalBufferDeadline: new Date(Date.now() + 80 * 3600 * 1000).toISOString(),
      officialDueDate: new Date(Date.now() + 152 * 3600 * 1000).toISOString(),
      peerReviewer: 'Alex',
      status: 'DRAFT_READY',
      artifactUrl: 'https://github.com/pola-rs/polars',
      notes: 'Initial lazy query plan benchmark ready for peer review.',
    },
  ],
  quickLinks: [
    {
      id: 'ql-1',
      category: 'ACADEMIC',
      title: 'University LMS Canvas',
      url: 'https://canvas.instructure.com',
      sortOrder: 1,
    },
    {
      id: 'ql-2',
      category: 'ACADEMIC',
      title: 'Student Portal & Transcripts',
      url: 'https://student.university.edu',
      sortOrder: 2,
    },
    {
      id: 'ql-3',
      category: 'DOCS',
      title: 'Python 3.12 Documentation',
      url: 'https://docs.python.org/3/',
      sortOrder: 3,
    },
    {
      id: 'ql-4',
      category: 'DOCS',
      title: 'Polars & Pandas Cheatsheets',
      url: 'https://pandas.pydata.org/docs/user_guide/index.html',
      sortOrder: 4,
    },
    {
      id: 'ql-5',
      category: 'REPO',
      title: 'Team GitHub Organization',
      url: 'https://github.com',
      sortOrder: 5,
    },
    {
      id: 'ql-6',
      category: 'TOOL',
      title: 'Project Google Drive Root',
      url: 'https://drive.google.com',
      sortOrder: 6,
    },
  ],
  calendarEvents: SAMPLE_CALENDAR_EVENTS,
  cloudSync: {
    enabled: false,
    provider: 'supabase',
    endpointUrl: '',
    apiKey: '',
    workspaceId: 'ds-fall2026-hub',
  },
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveAppData(DEFAULT_APP_DATA)
      return DEFAULT_APP_DATA
    }
    const parsed: AppData = JSON.parse(raw)
    // Basic schema validation & migration
    if (!parsed.courses || !parsed.deliverables || !parsed.projects) {
      saveAppData(DEFAULT_APP_DATA)
      return DEFAULT_APP_DATA
    }
    if (!parsed.calendarEvents) {
      parsed.calendarEvents = SAMPLE_CALENDAR_EVENTS
    }
    if (!parsed.cloudSync) {
      parsed.cloudSync = DEFAULT_APP_DATA.cloudSync
    }
    return parsed
  } catch (err) {
    console.error('Error loading app data from localStorage:', err)
    return DEFAULT_APP_DATA
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Error saving app data to localStorage:', err)
  }
}

export function exportAppDataJson(data: AppData): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', jsonString)
  downloadAnchor.setAttribute('download', `student_hub_backup_${new Date().toISOString().slice(0, 10)}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

export function importAppDataJson(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = JSON.parse(text)
        if (!parsed.courses || !parsed.deliverables || !parsed.projects) {
          throw new Error('Invalid schema: Missing courses, deliverables, or projects.')
        }
        saveAppData(parsed)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
