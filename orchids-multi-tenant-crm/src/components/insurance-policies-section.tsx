"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { supabase, LINES_OF_COVERAGE } from '@/lib/supabase'
import type { InsurancePolicy } from '@/lib/supabase'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, FileText, Trash2, Upload, Download, Calendar, DollarSign,
  Shield, AlertCircle, Sparkles, Loader2, CheckCircle, XCircle,
  BarChart3, FileDown
} from 'lucide-react'
import { format, isPast, isBefore, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface InsurancePoliciesSectionProps {
  tenantId: string
  companyId: string
  partnerId?: string | null
  policies: InsurancePolicy[]
  onPoliciesChange: () => void
  readOnly?: boolean
  uploadedByType?: 'tenant' | 'partner' | 'company'
}

export function InsurancePoliciesSection({
  tenantId,
  companyId,
  partnerId,
  policies,
  onPoliciesChange,
  readOnly = false,
  uploadedByType = 'tenant',
}: InsurancePoliciesSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [analyzingPolicyId, setAnalyzingPolicyId] = useState<string | null>(null)
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    policy_number: '',
    carrier: '',
    line_of_coverage: '',
    coverage_limit: '',
    deductible: '',
    effective_date: '',
    expiration_date: '',
    premium: '',
    notes: '',
  })

  // Poll for in-progress analyses
  const hasInProgress = policies.some(p =>
    p.analysis_status && ['processing', 'analyzing', 'extracting', 'generating', 'retrying'].includes(p.analysis_status)
  )

  useEffect(() => {
    if (!hasInProgress) return

    const interval = setInterval(() => {
      onPoliciesChange()
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [hasInProgress, onPoliciesChange])

  function resetForm() {
    setFormData({
      policy_number: '',
      carrier: '',
      line_of_coverage: '',
      coverage_limit: '',
      deductible: '',
      effective_date: '',
      expiration_date: '',
      premium: '',
      notes: '',
    })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)

    try {
      let storagePath: string | null = null
      let fileName: string | null = null
      let fileType: string | null = null
      let fileSize: number | null = null

      if (selectedFile) {
        // Validate file size (50MB max)
        if (selectedFile.size > 50 * 1024 * 1024) {
          alert('File size exceeds 50MB limit')
          return
        }

        // Validate file type
        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
          // Allow non-PDF for general uploads but warn
        }

        const filePath = `${tenantId}/${companyId}/${Date.now()}-${selectedFile.name}`

        const { error: uploadError } = await supabase.storage
          .from('insurance-policies')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        storagePath = filePath
        fileName = selectedFile.name
        fileType = selectedFile.type
        fileSize = selectedFile.size
      }

      // Generate ID client-side so we can trigger analysis without depending on SELECT
      const policyId = crypto.randomUUID()

      const { error } = await supabase.from('insurance_policies').insert({
        id: policyId,
        tenant_id: tenantId,
        company_id: companyId,
        partner_id: partnerId || null,
        policy_number: formData.policy_number || null,
        carrier: formData.carrier,
        line_of_coverage: formData.line_of_coverage,
        coverage_limit: parseFloat(formData.coverage_limit) || null,
        deductible: parseFloat(formData.deductible) || null,
        effective_date: formData.effective_date || null,
        expiration_date: formData.expiration_date || null,
        premium: parseFloat(formData.premium) || null,
        notes: formData.notes || null,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        storage_path: storagePath,
        uploaded_by_type: uploadedByType,
      })

      if (error) throw error

      setIsDialogOpen(false)
      resetForm()
      onPoliciesChange()

      // Auto-trigger analysis if a cyber policy file was uploaded
      // Note: DB webhook will also fire, but this provides immediate feedback
      if (storagePath && formData.line_of_coverage === 'Cyber Liability') {
        try {
          const analyzeRes = await fetch(`/api/policies/${policyId}/analyze`, { method: 'POST' })
          const analyzeData = await analyzeRes.json()
          console.log('Auto-analysis triggered:', analyzeData)
          onPoliciesChange()
        } catch (analyzeError) {
          console.error('Auto-analysis dispatch failed:', analyzeError)
        }
      }
    } catch (error) {
      console.error('Error adding policy:', error)
    } finally {
      setUploading(false)
    }
  }

  async function handleAnalyze(policy: InsurancePolicy) {
    if (!policy.storage_path) {
      alert('This policy has no attached file to analyze.')
      return
    }

    setAnalyzingPolicyId(policy.id)

    try {
      const response = await fetch(`/api/policies/${policy.id}/analyze`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start analysis')
      }

      // Refresh policies to show updated status
      onPoliciesChange()
    } catch (error) {
      console.error('Error starting analysis:', error)
      alert(error instanceof Error ? error.message : 'Failed to start analysis')
    } finally {
      setAnalyzingPolicyId(null)
    }
  }

  async function handleDelete(policy: InsurancePolicy) {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      if (policy.storage_path) {
        await supabase.storage
          .from('insurance-policies')
          .remove([policy.storage_path])
      }

      // Also delete the report if it exists
      if (policy.report_storage_path) {
        await supabase.storage
          .from('reports')
          .remove([policy.report_storage_path])
      }

      await supabase.from('insurance_policies').delete().eq('id', policy.id)
      onPoliciesChange()
    } catch (error) {
      console.error('Error deleting policy:', error)
    }
  }

  async function handleDownload(policy: InsurancePolicy) {
    if (!policy.storage_path) return

    try {
      const { data, error } = await supabase.storage
        .from('insurance-policies')
        .download(policy.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = policy.file_name || 'policy'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  async function handleDownloadReport(policy: InsurancePolicy) {
    if (!policy.report_storage_path) return

    setDownloadingReportId(policy.id)

    try {
      // Generate a signed URL for the report
      const { data, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(policy.report_storage_path, 300) // 5 min expiry

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Error downloading report:', error)
      alert('Failed to download report. Please try again.')
    } finally {
      setDownloadingReportId(null)
    }
  }

  function getExpirationStatus(expirationDate: string | null) {
    if (!expirationDate) return null
    const date = new Date(expirationDate)
    const now = new Date()

    if (isPast(date)) {
      return { label: 'Expired', color: 'bg-red-100 text-red-700' }
    }
    if (isBefore(date, addDays(now, 30))) {
      return { label: 'Expiring Soon', color: 'bg-amber-100 text-amber-700' }
    }
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' }
  }

  function getAnalysisStatusBadge(policy: InsurancePolicy) {
    const status = policy.analysis_status

    if (!status) return null

    switch (status) {
      case 'processing':
      case 'extracting':
        return (
          <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Extracting
          </Badge>
        )
      case 'analyzing':
        return (
          <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing
          </Badge>
        )
      case 'generating':
        return (
          <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating Report
          </Badge>
        )
      case 'retrying':
        return (
          <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Retrying
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Analyzed
          </Badge>
        )
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Failed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{policy.analysis_error || 'Analysis failed'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {status}
          </Badge>
        )
    }
  }

  function getScoreColor(score: number | null | undefined): string {
    if (!score) return 'text-muted-foreground'
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  const activePolicies = policies.filter(p => p.status === 'active')
  const totalPremium = activePolicies.reduce((sum, p) => sum + (Number(p.premium) || 0), 0)
  const expiringCount = activePolicies.filter(p => {
    if (!p.expiration_date) return false
    const date = new Date(p.expiration_date)
    return isBefore(date, addDays(new Date(), 30)) && !isPast(date)
  }).length

  // Check if a policy can be analyzed (is cyber and has a file)
  const canAnalyze = (policy: InsurancePolicy) => {
    return (
      policy.storage_path &&
      policy.line_of_coverage === 'Cyber Liability' &&
      !policy.analysis_status?.match(/processing|analyzing|extracting|generating|retrying/)
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{activePolicies.length} policies</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>${totalPremium.toLocaleString()} total premium</span>
          </div>
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>{expiringCount} expiring soon</span>
            </div>
          )}
        </div>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Insurance Policy</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carrier">Carrier / Insurer *</Label>
                    <Input
                      id="carrier"
                      value={formData.carrier}
                      onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                      placeholder="e.g., Travelers, Chubb, AIG"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="policy_number">Policy Number</Label>
                    <Input
                      id="policy_number"
                      value={formData.policy_number}
                      onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                      placeholder="e.g., POL-123456"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line_of_coverage">Line of Coverage *</Label>
                  <Select
                    value={formData.line_of_coverage}
                    onValueChange={(v) => setFormData({ ...formData, line_of_coverage: v })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select coverage type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LINES_OF_COVERAGE.map(line => (
                        <SelectItem key={line} value={line}>{line}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coverage_limit">Coverage Limit ($)</Label>
                    <Input
                      id="coverage_limit"
                      type="number"
                      value={formData.coverage_limit}
                      onChange={(e) => setFormData({ ...formData, coverage_limit: e.target.value })}
                      placeholder="e.g., 1000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductible">Deductible ($)</Label>
                    <Input
                      id="deductible"
                      type="number"
                      value={formData.deductible}
                      onChange={(e) => setFormData({ ...formData, deductible: e.target.value })}
                      placeholder="e.g., 5000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effective_date">Effective Date</Label>
                    <Input
                      id="effective_date"
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiration_date">Expiration Date</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="premium">Annual Premium ($)</Label>
                  <Input
                    id="premium"
                    type="number"
                    value={formData.premium}
                    onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                    placeholder="e.g., 25000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Policy Document (optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="policy-file"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <label htmlFor="policy-file" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF only (max 50MB)
                        </p>
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes about this policy..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Add Policy'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Limit / Deductible</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Analysis</TableHead>
              {!readOnly && <TableHead className="w-[100px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center py-12">
                  <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No insurance policies</p>
                  {!readOnly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Add a policy to track coverage
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => {
                const status = getExpirationStatus(policy.expiration_date)
                const isAnalyzing = analyzingPolicyId === policy.id
                const isDownloadingReport = downloadingReportId === policy.id
                return (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{policy.carrier}</p>
                          {policy.policy_number && (
                            <p className="text-xs text-muted-foreground">
                              #{policy.policy_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {policy.line_of_coverage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {policy.coverage_limit ? (
                          <p>${Number(policy.coverage_limit).toLocaleString()}</p>
                        ) : (
                          <p className="text-muted-foreground">-</p>
                        )}
                        {policy.deductible && (
                          <p className="text-xs text-muted-foreground">
                            ${Number(policy.deductible).toLocaleString()} ded.
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {policy.effective_date && policy.expiration_date ? (
                          <>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(policy.effective_date), 'M/d/yy')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              to {format(new Date(policy.expiration_date), 'M/d/yy')}
                            </p>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {policy.premium ? (
                        <span className="font-medium">
                          ${Number(policy.premium).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {status && (
                          <Badge className={cn("text-xs", status.color)}>
                            {status.label}
                          </Badge>
                        )}
                        {policy.file_name && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleDownload(policy)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            File
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getAnalysisStatusBadge(policy)}
                        {policy.analysis_score != null && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className={cn("h-3 w-3", getScoreColor(policy.analysis_score))} />
                            <span className={cn("text-sm font-semibold", getScoreColor(policy.analysis_score))}>
                              {policy.analysis_score}
                            </span>
                          </div>
                        )}
                        {/* Download Report button */}
                        {policy.report_storage_path && policy.analysis_status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleDownloadReport(policy)}
                            disabled={isDownloadingReport}
                          >
                            {isDownloadingReport ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <FileDown className="h-3 w-3 mr-1" />
                            )}
                            Report
                          </Button>
                        )}
                        {/* Analyze button for unanalyzed cyber policies */}
                        {canAnalyze(policy) && !policy.analysis_status && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAnalyze(policy)}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            Analyze
                          </Button>
                        )}
                        {/* Retry button for failed analyses */}
                        {policy.analysis_status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAnalyze(policy)}
                            disabled={isAnalyzing}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(policy)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
