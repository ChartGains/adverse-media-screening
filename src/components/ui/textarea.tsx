'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[100px] w-full rounded-lg border bg-white px-3 py-2 text-sm transition-colors',
            'placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-y',
            error
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-slate-300 focus-visible:ring-slate-400',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
