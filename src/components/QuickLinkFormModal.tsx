import React, { useState } from 'react'
import type { QuickLink, QuickLinkCategory } from '../types'
import { X, Link2 } from 'lucide-react'

interface QuickLinkFormModalProps {
  link?: QuickLink | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<QuickLink, 'id'> & { id?: string }) => void
}

export const QuickLinkFormModal: React.FC<QuickLinkFormModalProps> = ({
  link,
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(link?.title ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const [category, setCategory] = useState<QuickLinkCategory>(link?.category ?? 'DOCS')
  const [sortOrder, setSortOrder] = useState<number>(link?.sortOrder ?? 1)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) {
      setError('Title and URL are required.')
      return
    }

    try {
      new URL(url)
    } catch {
      setError('Please enter a valid URL (starting with https:// or http://).')
      return
    }

    onSave({
      ...(link ? { id: link.id } : {}),
      title: title.trim(),
      url: url.trim(),
      category,
      sortOrder,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#171E1C] border border-[#2D3834] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <div className="flex items-start justify-between pb-4 border-b border-[#2D3834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#5B8266]/20 border border-[#5B8266]/30 text-[#5B8266]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#E0E6E4]">
                {link ? 'Edit Quick Link' : 'Add Shortcut Link'}
              </h3>
              <p className="text-xs text-[#8C9E96]">Academic, repository, and doc portal shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8C9E96] hover:text-[#E0E6E4] p-1.5 rounded-lg hover:bg-[#1B2220] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="my-3 p-3 rounded-lg bg-[#2A1717] border border-[#A36262]/40 text-xs text-[#E0E6E4]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium">Link Title</label>
            <input
              type="text"
              placeholder="e.g. Scikit-learn API Reference"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-[#8C9E96] mb-1 font-medium">Destination Target URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] focus:border-[#5B8266] text-[#E0E6E4] font-mono outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuickLinkCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] outline-none"
              >
                <option value="ACADEMIC">ACADEMIC</option>
                <option value="DOCS">DOCS</option>
                <option value="REPO">REPO</option>
                <option value="TOOL">TOOL</option>
              </select>
            </div>
            <div>
              <label className="block text-[#8C9E96] mb-1 font-medium">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#131716] border border-[#2D3834] text-[#E0E6E4] font-mono outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2D3834]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#2D3834] text-[#8C9E96] hover:text-[#E0E6E4] hover:bg-[#1B2220] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#5B8266] hover:bg-[#6E997B] text-[#E0E6E4] font-medium transition-colors"
            >
              {link ? 'Update Link' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
