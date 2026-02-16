export const DEAL_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-slate-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-amber-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-purple-500' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-emerald-500' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
] as const

export const TICKET_STATUSES = [
  { id: 'open', label: 'Open', color: 'bg-amber-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { id: 'closed', label: 'Closed', color: 'bg-slate-500' },
] as const

export const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-slate-400' },
  { id: 'medium', label: 'Medium', color: 'bg-amber-500' },
  { id: 'high', label: 'High', color: 'bg-red-500' },
] as const

export const PARTNER_STATUSES = [
  { id: 'active', label: 'Active', color: 'bg-emerald-500' },
  { id: 'inactive', label: 'Inactive', color: 'bg-slate-400' },
  { id: 'pending', label: 'Pending', color: 'bg-amber-500' },
] as const

export const REFERRAL_STATUSES = [
  { id: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { id: 'converted', label: 'Converted', color: 'bg-emerald-500' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500' },
] as const
