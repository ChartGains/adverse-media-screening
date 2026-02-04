'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  User,
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { UserProfile } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single() as { data: UserProfile | null }

    if (data) {
      setProfile(data)
      setFormData({
        full_name: data.full_name,
        department: data.department || '',
      })
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: formData.full_name,
        department: formData.department || null,
      } as never)
      .eq('id', profile.id)

    setIsSaving(false)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      await loadProfile()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!profile) return null

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    senior_analyst: 'bg-blue-100 text-blue-700',
    analyst: 'bg-green-100 text-green-700',
    auditor: 'bg-amber-100 text-amber-700',
    api_user: 'bg-slate-100 text-slate-700',
  }

  return (
    <>
      <Header 
        title="Settings" 
        subtitle="Manage your account settings"
      />
      
      <div className="p-6 max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.type === 'success' 
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />
                }
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="e.g., Compliance, Legal, Risk"
                />
              </div>
            </div>

            <Button 
              onClick={handleSave} 
              isLoading={isSaving}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Role</span>
              <Badge className={roleColors[profile.role] || 'bg-slate-100 text-slate-700'}>
                {profile.role.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status</span>
              <Badge variant={profile.is_active ? 'success' : 'secondary'}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Last Active</span>
              <span className="text-sm text-slate-900">
                {profile.last_active_at ? formatDateTime(profile.last_active_at) : 'Never'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Account Created</span>
              <span className="text-sm text-slate-900">
                {formatDateTime(profile.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
