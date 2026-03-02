'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'

interface DeleteScreeningButtonProps {
  subjectId: string
  subjectName: string
  /** Where to redirect after deletion. Defaults to /dashboard */
  redirectTo?: string
  /** Render as a small icon button (for lists) vs full button */
  variant?: 'icon' | 'full'
}

export function DeleteScreeningButton({
  subjectId,
  subjectName,
  redirectTo = '/dashboard',
  variant = 'full'
}: DeleteScreeningButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/screening/${subjectId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }

      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete screening. Please try again.')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Delete &quot;{subjectName}&quot;?</span>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowConfirm(true)
        }}
        title="Delete screening"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      onClick={() => setShowConfirm(true)}
    >
      <Trash2 className="h-4 w-4" />
      Delete Screening
    </Button>
  )
}
