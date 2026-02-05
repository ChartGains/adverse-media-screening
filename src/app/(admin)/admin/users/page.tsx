'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Users,
  Search,
  UserPlus,
  CheckCircle2,
  XCircle,
  X,
  ChevronRight,
} from 'lucide-react'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { UserProfile, UserRole } from '@/types/database'

interface UserWithManager extends UserProfile {
  manager?: { full_name: string; email: string } | null
}

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserWithManager[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  
  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'analyst' as UserRole,
    department: '',
    manager_id: '',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    
    // First try with manager join, fallback to simple query
    let { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        manager:manager_id (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // If manager join fails (column doesn't exist), try simple query
    if (error) {
      console.log('Manager join failed, using simple query:', error.message)
      const result = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      data = result.data as typeof data
      error = result.error
    }

    if (error) {
      console.error('Failed to load users:', error)
    }

    setUsers((data as unknown as UserWithManager[]) || [])
    setIsLoading(false)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus } as never)
      .eq('id', userId)
    
    await loadUsers()
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    await supabase
      .from('user_profiles')
      .update({ role: newRole } as never)
      .eq('id', userId)
    
    await loadUsers()
  }

  const updateUserManager = async (userId: string, managerId: string | null) => {
    await supabase
      .from('user_profiles')
      .update({ manager_id: managerId || null } as never)
      .eq('id', userId)
    
    await loadUsers()
  }

  // Get potential managers (senior analysts and admins)
  const potentialManagers = users.filter(u => 
    u.is_active && (u.role === 'senior_analyst' || u.role === 'admin')
  )

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete ${userEmail}? This cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const result = await response.json()
        alert(result.error || 'Failed to delete user')
        return
      }

      await loadUsers()
    } catch (error) {
      alert('Failed to delete user')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError(null)
    setCreateSuccess(null)

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })

      const result = await response.json()

      if (!response.ok) {
        setCreateError(result.error || 'Failed to invite user')
        return
      }

      // Success - show message then close modal
      setCreateSuccess(`Invitation sent to ${newUser.email}! They will receive an email to set their password.`)
      setNewUser({
        email: '',
        full_name: '',
        role: 'analyst',
        department: '',
        manager_id: '',
      })
      await loadUsers()
      
      // Close modal after showing success
      setTimeout(() => {
        setShowAddModal(false)
        setCreateSuccess(null)
      }, 3000)
    } catch (error) {
      setCreateError('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-700',
    senior_analyst: 'bg-blue-100 text-blue-700',
    analyst: 'bg-green-100 text-green-700',
    auditor: 'bg-amber-100 text-amber-700',
    api_user: 'bg-slate-100 text-slate-700',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <>
      <Header 
        title="User Management" 
        subtitle={`${users.length} total users`}
      />
      
      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-48"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="senior_analyst">Senior Analyst</option>
                <option value="analyst">Analyst</option>
                <option value="auditor">Auditor</option>
                <option value="api_user">API User</option>
              </Select>
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">User</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Manager</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Last Active</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-600">
                              {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.full_name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                          className="w-40 h-9 py-1 text-sm"
                        >
                          <option value="analyst">Analyst</option>
                          <option value="senior_analyst">Senior Analyst</option>
                          <option value="admin">Admin</option>
                          <option value="auditor">Auditor</option>
                          <option value="api_user">API User</option>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        {user.role === 'admin' || user.role === 'auditor' ? (
                          <span className="text-sm text-slate-400">N/A</span>
                        ) : (
                          <>
                            <Select
                              value={user.manager_id || ''}
                              onChange={(e) => updateUserManager(user.id, e.target.value || null)}
                              className="w-44 h-9 py-1 text-sm"
                            >
                              <option value="">No Manager</option>
                              {potentialManagers
                                .filter(m => m.id !== user.id) // Can't be own manager
                                .map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.full_name}
                                  </option>
                                ))
                              }
                            </Select>
                            {user.manager && (
                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                Reports to: {user.manager.full_name}
                              </p>
                            )}
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {user.is_active ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {user.last_active_at 
                          ? formatRelativeTime(user.last_active_at)
                          : 'Never'
                        }
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={user.is_active ? 'outline' : 'default'}
                            size="sm"
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteUser(user.id, user.email)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold text-slate-900 mb-1">Invite New User</h2>
            <p className="text-sm text-slate-500 mb-6">Send an email invitation to join the platform</p>

            {createSuccess ? (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Success!</span>
                </div>
                <p className="mt-1 text-sm">{createSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {createError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="full_name" required>Full Name</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Smith"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" required>Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@company.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-slate-500">User will receive an email to set their password</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" required>Role</Label>
                  <Select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => {
                      const role = e.target.value as UserRole
                      setNewUser({
                        ...newUser,
                        role,
                        manager_id: (role === 'admin' || role === 'auditor') ? '' : newUser.manager_id
                      })
                    }}
                    required
                  >
                    <option value="analyst">Analyst</option>
                    <option value="senior_analyst">Senior Analyst</option>
                    <option value="admin">Admin</option>
                    <option value="auditor">Auditor</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department (Optional)</Label>
                  <Input
                    id="department"
                    type="text"
                    placeholder="Compliance"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </div>

                {newUser.role !== 'admin' && newUser.role !== 'auditor' && (
                  <div className="space-y-2">
                    <Label htmlFor="manager">Manager (Optional)</Label>
                    <Select
                      id="manager"
                      value={newUser.manager_id}
                      onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value })}
                    >
                      <option value="">No Manager</option>
                      {potentialManagers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.role})
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-slate-500">Escalations will be sent to this person</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    isLoading={isCreating}
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
