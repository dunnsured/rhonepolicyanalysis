import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchPolicyAnalysis } from '@/lib/analysis-api'

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Resolve callback URL: explicit production URL > Vercel deployment > localhost fallback
const APP_URL = process.env.PRODUCTION_URL
  || process.env.NEXT_PUBLIC_APP_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params

    // Get the policy details
    const { data: policy, error: policyError } = await supabase
      .from('insurance_policies')
      .select(`
        *,
        company:companies(id, name, industry)
      `)
      .eq('id', policyId)
      .single()

    if (policyError || !policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    // Check if policy has a file
    if (!policy.storage_path) {
      return NextResponse.json(
        { error: 'Policy has no attached file to analyze' },
        { status: 400 }
      )
    }

    // Check if analysis is already in progress
    if (policy.analysis_status === 'processing' || policy.analysis_status === 'analyzing') {
      return NextResponse.json(
        { error: 'Analysis is already in progress for this policy' },
        { status: 409 }
      )
    }

    // Get a signed URL for the file (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('insurance-policies')
      .createSignedUrl(policy.storage_path, 3600)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Failed to create signed URL:', signedUrlError)
      return NextResponse.json(
        { error: 'Failed to generate file access URL' },
        { status: 500 }
      )
    }

    // Prepare the webhook payload
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
      policy_type: policy.line_of_coverage === 'Cyber Liability' ? 'cyber' : 'general',
      renewal: false,
      priority: 'normal',
      callback_url: `${APP_URL}/api/webhook/analysis-complete`,
    }

    // Update policy status to processing
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

    // Update with analysis ID
    await supabase
      .from('insurance_policies')
      .update({
        analysis_id: result.analysis_id,
        analysis_status: 'analyzing',
      })
      .eq('id', policyId)

    console.log(`🚀 Analysis dispatched for policy ${policyId}`)
    console.log(`   Analysis ID: ${result.analysis_id}`)
    console.log(`   Estimated time: ${result.estimated_time_seconds}s`)

    return NextResponse.json({
      success: true,
      analysis_id: result.analysis_id,
      message: result.message,
      estimated_time_seconds: result.estimated_time_seconds,
    })

  } catch (error) {
    console.error('Analysis dispatch error:', error)

    // Update status to failed
    const { id: policyId } = await params
    await supabase
      .from('insurance_policies')
      .update({
        analysis_status: 'failed',
        analysis_error: String(error),
      })
      .eq('id', policyId)

    return NextResponse.json(
      { error: 'Failed to start analysis', details: String(error) },
      { status: 500 }
    )
  }
}

// Get analysis status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params

    const { data: policy, error } = await supabase
      .from('insurance_policies')
      .select('analysis_id, analysis_status, analysis_score, analysis_recommendation, analysis_started_at, analysis_completed_at, analysis_error')
      .eq('id', policyId)
      .single()

    if (error || !policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      policy_id: policyId,
      ...policy,
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get analysis status' },
      { status: 500 }
    )
  }
}
