import type { GitHubRepoInfo } from '../types'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

interface CacheEntry {
  data: GitHubRepoInfo
  timestamp: number
}

export async function fetchGitHubRepoData(repoFullName: string, forceRefresh = false): Promise<GitHubRepoInfo> {
  const cleanRepo = repoFullName.trim()
  if (!cleanRepo || !cleanRepo.includes('/')) {
    return {
      repoName: cleanRepo || 'Not configured',
      openPrCount: 0,
      recentCommits: [],
      lastFetched: Date.now(),
      error: 'Please configure repository as "owner/repo" in Project Settings.',
    }
  }

  const cacheKey = `gh_cache_${cleanRepo}`

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed: CacheEntry = JSON.parse(cached)
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data
        }
      }
    } catch {
      // Ignore cache read failures
    }
  }

  try {
    const [commitsRes, pullsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=3`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }),
      fetch(`https://api.github.com/repos/${cleanRepo}/pulls?state=open&per_page=1`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }),
    ])

    if (!commitsRes.ok) {
      if (commitsRes.status === 403) {
        // Rate limit reached: return mock with warning
        return getFallbackMockRepo(cleanRepo, 'GitHub API rate limit exceeded (60 req/hr). Showing cached mock data.')
      }
      if (commitsRes.status === 404) {
        return {
          repoName: cleanRepo,
          openPrCount: 0,
          recentCommits: [],
          lastFetched: Date.now(),
          error: `Repository "${cleanRepo}" not found or private.`,
        }
      }
      throw new Error(`GitHub API error: ${commitsRes.statusText}`)
    }

    const commitsData = await commitsRes.json()

    // Get PR count from header or body
    let openPrCount = 0
    if (pullsRes.ok) {
      // GitHub includes total in 'link' header or length
      const pullsData = await pullsRes.json()
      openPrCount = Array.isArray(pullsData) ? pullsData.length : 0
      const linkHeader = pullsRes.headers.get('link')
      if (linkHeader) {
        const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
        if (lastMatch && lastMatch[1]) {
          openPrCount = parseInt(lastMatch[1], 10)
        }
      }
    }

    const recentCommits = Array.isArray(commitsData)
      ? commitsData.slice(0, 3).map((item: any) => ({
          sha: (item.sha || '').substring(0, 7),
          message: item.commit?.message?.split('\n')[0] || 'Commit message',
          author: item.commit?.author?.name || item.author?.login || 'Author',
          date: item.commit?.author?.date || new Date().toISOString(),
          htmlUrl: item.html_url || `https://github.com/${cleanRepo}/commit/${item.sha}`,
        }))
      : []

    const repoInfo: GitHubRepoInfo = {
      repoName: cleanRepo,
      openPrCount,
      recentCommits,
      lastFetched: Date.now(),
      isMock: false,
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: repoInfo, timestamp: Date.now() }))
    } catch {
      // LocalStorage quota may be reached
    }

    return repoInfo
  } catch (err: any) {
    return getFallbackMockRepo(cleanRepo, err.message || 'Network error fetching GitHub repository.')
  }
}

function getFallbackMockRepo(repoName: string, errorNotice?: string): GitHubRepoInfo {
  return {
    repoName,
    openPrCount: 2,
    recentCommits: [
      {
        sha: '9f2a71c',
        message: 'feat(avl-tree): implement double rotation rebalance logic',
        author: 'Alan',
        date: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        htmlUrl: `https://github.com/${repoName}`,
      },
      {
        sha: '4b1e882',
        message: 'test(benchmarks): add memory allocation benchmark for BST',
        author: 'Liam',
        date: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        htmlUrl: `https://github.com/${repoName}`,
      },
      {
        sha: 'c30d991',
        message: 'docs(readme): add milestone 2 buffer schedule and team roster',
        author: 'Alex',
        date: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        htmlUrl: `https://github.com/${repoName}`,
      },
    ],
    lastFetched: Date.now(),
    isMock: true,
    error: errorNotice,
  }
}
