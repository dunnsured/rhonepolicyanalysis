"use client"

import { PartnerPortalSidebar } from '@/components/partner-portal-sidebar'
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
import { supabase, DEMO_TENANT_ID, DEMO_PARTNER_ID } from '@/lib/supabase'
import type { Partner, Referral, PipelineStage } from '@/lib/supabase'
import { REFERRAL_STATUSES } from '@/lib/types'
import { useEffect, useState, useRef } from 'react'
import { Plus, Search, UserPlus, Mail, Phone, Building2, TrendingUp, Upload, FileText, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function PartnerReferralsPage() {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    referred_name: '',
    referred_email: '',
    referred_phone: '',
    referred_company: '',
    estimated_revenue: '',
    employee_count: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [partnerRes, referralsRes, stagesRes] = await Promise.all([
      supabase.from('partners').select('*').eq('id', DEMO_PARTNER_ID).single(),
      supabase.from('referrals').select('*, deal:deals(*, stage:pipeline_stages(*))').eq('partner_id', DEMO_PARTNER_ID).order('created_at', { ascending: false }),
      supabase.from('pipeline_stages').select('*').order('position'),
    ])

    setPartner(partnerRes.data)
    setReferrals(referralsRes.data || [])
    setStages(stagesRes.data || [])
    setLoading(false)
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
        const filePath = `referrals/${DEMO_PARTNER_ID}/${Date.now()}-${selectedFile.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('insurance-policies')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        storagePath = filePath
        fileName = selectedFile.name
        fileType = selectedFile.type
        fileSize = selectedFile.size
      }

      const data = {
        tenant_id: DEMO_TENANT_ID,
        partner_id: DEMO_PARTNER_ID,
        referred_name: formData.referred_name,
        referred_email: formData.referred_email || null,
        referred_phone: formData.referred_phone || null,
        referred_company: formData.referred_company || null,
        estimated_revenue: formData.estimated_revenue ? parseFloat(formData.estimated_revenue) : null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        notes: formData.notes || null,
        status: 'pending',
        commission_amount: 0,
        policy_file_name: fileName,
        policy_file_type: fileType,
        policy_file_size: fileSize,
        policy_storage_path: storagePath,
      }

      await supabase.from('referrals').insert(data)
      setIsDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error submitting referral:', error)
    } finally {
      setUploading(false)
    }
  }

  function resetForm() {
    setFormData({
      referred_name: '',
      referred_email: '',
      referred_phone: '',
      referred_company: '',
      estimated_revenue: '',
      employee_count: '',
      notes: '',
    })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = REFERRAL_STATUSES.find(s => s.id === status)
    return (
      <Badge className={cn("text-xs", statusConfig?.color, "text-white")}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const filteredReferrals = referrals.filter(r =>
    searchQuery === '' ||
    r.referred_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referred_company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referred_email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalReferrals = referrals.length
  const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'contacted').length
  const convertedReferrals = referrals.filter(r => r.status === 'converted').length
  const totalCommissions = referrals.reduce((sum, r) => sum + Number(r.commission_amount), 0)

  return (
    <PartnerPortalSidebar partnerName={partner?.name} companyName={partner?.company || undefined}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Referrals</h1>
            <p className="text-muted-foreground">Submit new clients and track your referrals</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Submit New Referral
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submit a New Client Referral</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Client Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client Name *</Label>
                      <Input 
                        value={formData.referred_name} 
                        onChange={(e) => setFormData({ ...formData, referred_name: e.target.value })} 
                        placeholder="Enter the client's full name"
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        value={formData.referred_company} 
                        onChange={(e) => setFormData({ ...formData, referred_company: e.target.value })} 
                        placeholder="Enter the company name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email" 
                        value={formData.referred_email} 
                        onChange={(e) => setFormData({ ...formData, referred_email: e.target.value })} 
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={formData.referred_phone} 
                        onChange={(e) => setFormData({ ...formData, referred_phone: e.target.value })} 
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Company Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        Estimated Revenue
                      </Label>
                      <Input 
                        type="number"
                        value={formData.estimated_revenue} 
                        onChange={(e) => setFormData({ ...formData, estimated_revenue: e.target.value })} 
                        placeholder="e.g., 5000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Employee Count
                      </Label>
                      <Input 
                        type="number"
                        value={formData.employee_count} 
                        onChange={(e) => setFormData({ ...formData, employee_count: e.target.value })} 
                        placeholder="e.g., 250"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Policy Upload</h3>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
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
                          Click to upload current insurance policy
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX, PNG, JPG (max 50MB)
                        </p>
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                    placeholder="Any additional information about this referral..."
                    rows={3} 
                  />
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <p>Your commission rate: <span className="font-semibold text-foreground">{partner?.commission_rate || 10}%</span></p>
                  <p className="mt-1">You&apos;ll earn commission once this referral converts to a closed deal.</p>
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={uploading}>
                  {uploading ? 'Submitting...' : 'Submit Referral'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReferrals}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReferrals}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{convertedReferrals}</p>
                <p className="text-sm text-muted-foreground">Converted</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${totalCommissions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Commissions</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search referrals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deal Stage</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredReferrals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <UserPlus className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No referrals found</p>
                    <p className="text-sm text-muted-foreground mt-1">Submit your first referral to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredReferrals.map(referral => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
                          <span className="text-sm font-semibold text-purple-600">
                            {referral.referred_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{referral.referred_name}</p>
                          {referral.referred_company && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {referral.referred_company}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {referral.referred_email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {referral.referred_email}
                          </div>
                        )}
                        {referral.referred_phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {referral.referred_phone}
                          </div>
                        )}
                        {!referral.referred_email && !referral.referred_phone && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(referral.status)}</TableCell>
                    <TableCell>
                      {referral.deal?.stage ? (
                        <Badge variant="outline" className="text-xs">
                          {referral.deal.stage.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not in pipeline</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "font-semibold",
                        Number(referral.commission_amount) > 0 ? "text-emerald-600" : "text-muted-foreground"
                      )}>
                        ${Number(referral.commission_amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(referral.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PartnerPortalSidebar>
  )
}
