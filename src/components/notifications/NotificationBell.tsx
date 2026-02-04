'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, AlertTriangle, UserPlus, Clock, Info } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface Notification {
  id: string
  type: 'escalation' | 'assignment' | 'mention' | 'system' | 'deadline'
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    loadNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId }),
    })
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
  }

  const markAllAsRead = async () => {
    setIsLoading(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setIsLoading(false)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    if (notification.link) {
      router.push(notification.link)
    }
    
    setIsOpen(false)
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'escalation':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'assignment':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'deadline':
        return <Clock className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-slate-500" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors
                    ${!notification.is_read ? 'bg-blue-50/50' : ''}
                  `}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {formatRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
