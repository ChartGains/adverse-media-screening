'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  Download,
} from 'lucide-react'

export default function BatchUploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Record<string, string>[] | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Parse CSV preview
    const text = await selectedFile.text()
    const lines = text.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Required headers check
    const requiredHeaders = ['full_name', 'date_of_birth', 'address', 'country']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      setError(`Missing required columns: ${missingHeaders.join(', ')}`)
      setFile(null)
      return
    }

    // Parse first 5 rows for preview
    const previewRows = lines.slice(1, 6).map(line => {
      const values = line.split(',')
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ''
      })
      return row
    })

    setPreview(previewRows)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/screening/batch', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      router.push('/dashboard/reports')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'full_name,date_of_birth,address,country,aliases,company_affiliation\nJohn Smith,1980-01-15,123 Main St London,United Kingdom,Johnny Smith,Acme Corp'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'screening_template.csv'
    a.click()
  }

  return (
    <>
      <Header 
        title="Batch Upload" 
        subtitle="Upload multiple subjects for screening"
      />
      
      <div className="p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a CSV file with subject information for batch screening
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Download */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                <div>
                  <p className="font-medium">Download Template</p>
                  <p className="text-sm text-slate-500">
                    Use this template to format your data correctly
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>

            {/* Required Fields */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Required Columns</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>full_name</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>date_of_birth (YYYY-MM-DD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>address</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>country</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Optional: aliases (semicolon separated), company_affiliation
              </p>
            </div>

            {/* File Upload */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-slate-400'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={`h-12 w-12 mx-auto mb-4 ${file ? 'text-emerald-600' : 'text-slate-400'}`} />
              {file ? (
                <>
                  <p className="font-medium text-emerald-700">{file.name}</p>
                  <p className="text-sm text-emerald-600">Click to change file</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-700">Click to select a CSV file</p>
                  <p className="text-sm text-slate-500">or drag and drop</p>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Preview (first 5 rows)</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(preview[0]).slice(0, 4).map(header => (
                          <th key={header} className="text-left py-2 px-3 font-medium text-slate-500">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          {Object.values(row).slice(0, 4).map((value, i) => (
                            <td key={i} className="py-2 px-3 text-slate-700">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {preview.length} rows will be processed
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleUpload}
                disabled={!file || isLoading}
                isLoading={isLoading}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                <Upload className="h-4 w-4" />
                Upload & Process
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
