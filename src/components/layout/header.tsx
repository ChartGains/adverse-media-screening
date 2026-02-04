'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Quick search..."
            className="w-64 pl-9 h-9"
          />
        </div>
        
        <NotificationBell />
      </div>
    </header>
  )
}
