import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifySignature, AnalysisResult } from '@/lib/analysis-api'

// Use service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('X-Webhook-Signature')?.replace('sha256=', '') || ''

    // Enforce signature verification when secret is configured
    if (WEBHOOK_SECRET) {
      if (!signature) {
        console.error('Webhook received without signature - rejecting')
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        )
      }

      const isValid = verifySignature(rawBody, signature, WEBHOOK_SECRET)
      if (!isValid) {
        console.error('Invalid webhook signature - rejecting')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // Parse the result
    const result: AnalysisResult = JSON.parse(rawBody)
    console.log(`Received analysis callback for policy: ${result.policy_id}`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Score: ${result.overall_score}`)

    // Update the insurance policy record with analysis results
    const updateData: Record<string, unknown> = {
      analysis_id: result.analysis_id,
      analysis_status: result.status,
      analysis_completed_at: result.completed_at,
      updated_at: new Date().toISOString(),
    }

    if (result.status === 'completed') {
      updateData.analysis_score = result.overall_score
      updateData.analysis_recommendation = result.recommendation
      updateData.analysis_data = result.analysis_data
      if (result.report_storage_path) {
        updateData.report_storage_path = result.report_storage_path
      }
    } else if (result.status === 'failed') {
      updateData.analysis_error = result.error_message
    }

    const { error: updateError } = await supabase
      .from('insurance_policies')
      .update(updateData)
      .eq('id', result.policy_id)

    if (updateError) {
      console.error('Failed to update policy:', updateError)
      return NextResponse.json(
        { error: 'Failed to update policy record', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`Successfully updated policy ${result.policy_id} with analysis results`)

    return NextResponse.json({
      success: true,
      message: 'Analysis results received and saved',
      policy_id: result.policy_id,
    })

  } catch (error) {
    console.error('Callback processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Health check for the callback endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'analysis-complete-callback',
    timestamp: new Date().toISOString(),
  })
}
