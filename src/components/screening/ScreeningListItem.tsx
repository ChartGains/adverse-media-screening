'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface ScreeningListItemProps {
  screening: {
    id: string
    full_name: string
    country: string | null
    status: string
    risk_level: string | null
  }
  href: string
  subtitle: string
  badgeType: 'status' | 'risk'
  statusColor?: string
}

export function ScreeningListItem({ screening, href, subtitle, badgeType, statusColor }: ScreeningListItemProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/screening/${screening.id}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      router.refresh()
    } catch {
      alert('Failed to delete screening.')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50">
        <span className="text-sm text-red-700 truncate">Delete &quot;{screening.full_name}&quot;?</span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Delete'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)} disabled={isDeleting}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center group">
      <Link
        href={href}
        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors flex-1 min-w-0"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">{screening.full_name}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {badgeType === 'risk' ? (
          <Badge variant={screening.risk_level as 'critical' | 'high' | 'medium' | 'low' | 'none' || 'secondary'}>
            {screening.risk_level || 'Pending'}
          </Badge>
        ) : (
          <Badge className={statusColor}>{screening.status}</Badge>
        )}
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(true)
        }}
        className="ml-1 p-2 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Delete screening"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
