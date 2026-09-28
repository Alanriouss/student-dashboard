import type { DiffItem, FieldDiff, TableDiffResult } from '../types'

/**
 * Coerce or normalize values for fair comparison between Google Sheets string output and TypeScript objects.
 */
function normalizeValue(val: unknown): unknown {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  if (typeof val === 'boolean') return val

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed)
    }
    if (trimmed.toLowerCase() === 'true') return true
    if (trimmed.toLowerCase() === 'false') return false
    return trimmed
  }

  return val
}

/**
 * Compare two values after normalization.
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
  const normA = normalizeValue(a)
  const normB = normalizeValue(b)
  return normA === normB
}

/**
 * Compute differences between local items and remote incoming items from Google Sheets / REST.
 */
export function computeTableDiff<T extends { id: string }>(
  tableName: string,
  localItems: T[],
  remoteItems: T[],
  getDescription?: (item: T) => string
): TableDiffResult<T> {
  const diffItems: DiffItem<T>[] = []
  const localMap = new Map<string, T>(localItems.map((item) => [item.id, item]))

  for (const remote of remoteItems) {
    if (!remote || !remote.id) continue

    const local = localMap.get(remote.id)
    const desc = getDescription ? getDescription(remote) : (remote as any).taskName || (remote as any).title || (remote as any).code || remote.id

    if (!local) {
      // New item incoming from sheet
      diffItems.push({
        id: remote.id,
        status: 'NEW',
        remoteItem: remote,
        changedFields: [],
        description: desc,
      })
      continue
    }

    // Existing item: compare fields
    const changedFields: FieldDiff[] = []
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])

    for (const key of allKeys) {
      if (key === 'id') continue
      const localVal = (local as any)[key]
      const remoteVal = (remote as any)[key]

      if (!areValuesEqual(localVal, remoteVal)) {
        changedFields.push({
          field: key,
          oldValue: localVal,
          newValue: remoteVal,
        })
      }
    }

    if (changedFields.length > 0) {
      diffItems.push({
        id: remote.id,
        status: 'MODIFIED',
        localItem: local,
        remoteItem: remote,
        changedFields,
        description: desc,
      })
    }
  }

  const newCount = diffItems.filter((d) => d.status === 'NEW').length
  const modifiedCount = diffItems.filter((d) => d.status === 'MODIFIED').length

  return {
    tableName,
    items: diffItems,
    newCount,
    modifiedCount,
    totalChanges: diffItems.length,
  }
}

/**
 * Merge selected diffs into local items array.
 * Unselected items or non-diff items are preserved without alteration.
 */
export function mergeSelectedDiffs<T extends { id: string }>(
  localItems: T[],
  selectedDiffs: DiffItem<T>[]
): T[] {
  if (selectedDiffs.length === 0) return [...localItems]

  const selectedMap = new Map<string, DiffItem<T>>(selectedDiffs.map((d) => [d.id, d]))
  const merged: T[] = []
  const processedIds = new Set<string>()

  // 1. Process existing local items
  for (const item of localItems) {
    const diff = selectedMap.get(item.id)
    if (diff && diff.remoteItem) {
      // Apply accepted update
      merged.push(diff.remoteItem)
      processedIds.add(item.id)
    } else {
      // Keep untouched local version
      merged.push(item)
      processedIds.add(item.id)
    }
  }

  // 2. Append accepted NEW items
  for (const diff of selectedDiffs) {
    if (diff.status === 'NEW' && diff.remoteItem && !processedIds.has(diff.id)) {
      merged.push(diff.remoteItem)
      processedIds.add(diff.id)
    }
  }

  return merged
}
