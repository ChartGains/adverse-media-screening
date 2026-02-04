'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            'flex h-10 w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500 focus-visible:ring-red-500'
              : 'border-slate-300 focus-visible:ring-slate-400',
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
