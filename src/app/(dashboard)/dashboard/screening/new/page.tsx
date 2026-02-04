'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, X, Search } from 'lucide-react'

const countries = [
  'United Kingdom',
  'United States',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Australia',
  'Canada',
  'Singapore',
  'Hong Kong',
  'Japan',
  'Other',
]

export default function NewScreeningPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aliases, setAliases] = useState<string[]>([''])

  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    address: '',
    country: '',
    company_affiliation: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleAliasChange = (index: number, value: string) => {
    const newAliases = [...aliases]
    newAliases[index] = value
    setAliases(newAliases)
  }

  const addAlias = () => {
    setAliases([...aliases, ''])
  }

  const removeAlias = (index: number) => {
    setAliases(aliases.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch('/api/screening/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          aliases: aliases.filter(a => a.trim()),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit screening')
      }

      router.push(`/dashboard/screening/${data.screening.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header 
        title="New Screening" 
        subtitle="Submit a subject for adverse media screening"
      />
      
      <div className="p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
            <CardDescription>
              Enter the details of the individual to be screened. Only the name is required, but additional details improve accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name - REQUIRED */}
              <div className="space-y-2">
                <Label htmlFor="full_name" required>Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="John Smith"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Aliases */}
              <div className="space-y-2">
                <Label>Aliases / Alternative Names</Label>
                <p className="text-sm text-slate-500">Add any known aliases or previous names (optional)</p>
                <div className="space-y-2">
                  {aliases.map((alias, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Alternative name"
                        value={alias}
                        onChange={(e) => handleAliasChange(index, e.target.value)}
                        disabled={isLoading}
                      />
                      {aliases.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeAlias(index)}
                          disabled={isLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAlias}
                    disabled={isLoading}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Alias
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-sm font-medium text-slate-700 mb-4">Additional Information (Optional)</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Country */}
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    >
                      <option value="">Select a country</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2 mt-4">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="123 Main Street, City, Postal Code"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="min-h-[80px]"
                  />
                </div>

                {/* Company Affiliation */}
                <div className="space-y-2 mt-4">
                  <Label htmlFor="company_affiliation">Company Affiliation</Label>
                  <Input
                    id="company_affiliation"
                    name="company_affiliation"
                    placeholder="Company name"
                    value={formData.company_affiliation}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  isLoading={isLoading}
                >
                  <Search className="h-4 w-4" />
                  Start Screening
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
