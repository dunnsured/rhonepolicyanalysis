import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchPolicyAnalysis } from '@/lib/analysis-api'

/**
 * Auto-analyze endpoint — triggered by Supabase Database Webhook
 *
 * When a new insurance_policies row is inserted with a storage_path and
 * line_of_coverage = 'Cyber Liability', the DB webhook fires a POST here.
 * This replaces the fragile client-side auto-trigger, ensuring analysis
 * runs even if the user closes their browser.
 */

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Resolve callback URL
const APP_URL = process.env.PRODUCTION_URL
  || process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    // Verify this is from Supabase (service role key in Authorization header)
    const authHeader = request.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (!SERVICE_ROLE_KEY || token !== SERVICE_ROLE_KEY) {
      console.error('Auto-analyze: unauthorized request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse the webhook payload from Supabase
    // Supabase DB webhooks send: { type, table, record, schema, old_record }
    const body = await request.json()
    const record = body.record || body

    const policyId = record.id
    if (!policyId) {
      return NextResponse.json(
        { error: 'No policy ID in webhook payload' },
        { status: 400 }
      )
    }

    // Fetch full policy with company info
    const { data: policy, error: policyError } = await supabase
      .from('insurance_policies')
      .select(`
        *,
        company:companies(id, name, industry)
      `)
      .eq('id', policyId)
      .single()

    if (policyError || !policy) {
      console.error('Auto-analyze: policy not found:', policyId)
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // Guard: only analyze cyber policies with files
    if (!policy.storage_path) {
      return NextResponse.json({
        skipped: true,
        reason: 'No file attached',
      })
    }

    if (policy.line_of_coverage !== 'Cyber Liability') {
      return NextResponse.json({
        skipped: true,
        reason: 'Not a cyber liability policy',
      })
    }

    // Guard: don't re-analyze
    if (policy.analysis_status && ['processing', 'analyzing', 'completed'].includes(policy.analysis_status)) {
      return NextResponse.json({
        skipped: true,
        reason: `Analysis already ${policy.analysis_status}`,
      })
    }

    // Generate signed URL for the PDF
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('insurance-policies')
      .createSignedUrl(policy.storage_path, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Auto-analyze: failed to create signed URL:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate file access URL' },
        { status: 500 }
      )
    }

    // Build dispatch payload
    const company = policy.company as { id: string; name: string; industry: string } | null

    const payload = {
      policy_id: policy.id,
      tenant_id: policy.tenant_id,
      client_id: policy.company_id,
      client_name: company?.name || 'Unknown Company',
      client_industry: company?.industry || 'Other/General',
      file_url: signedUrlData.signedUrl,
      file_name: policy.file_name || 'policy.pdf',
      file_size: policy.file_size || 0,
      uploaded_by: policy.uploaded_by_type || 'tenant',
      policy_type: 'cyber',
      renewal: false,
      priority: 'normal',
      callback_url: `${APP_URL}/api/webhook/analysis-complete`,
    }

    // Mark as processing
    await supabase
      .from('insurance_policies')
      .update({
        analysis_status: 'processing',
        analysis_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)

    // Dispatch to Analysis API
    const result = await dispatchPolicyAnalysis(payload)

    // Store analysis_id
    await supabase
      .from('insurance_policies')
      .update({
        analysis_id: result.analysis_id,
        analysis_status: 'analyzing',
      })
      .eq('id', policyId)

    console.log(`Auto-analysis dispatched for policy ${policyId}, analysis_id: ${result.analysis_id}`)

    return NextResponse.json({
      success: true,
      analysis_id: result.analysis_id,
      policy_id: policyId,
    })

  } catch (error) {
    console.error('Auto-analyze error:', error)
    return NextResponse.json(
      { error: 'Auto-analyze failed', details: String(error) },
      { status: 500 }
    )
  }
}
