import crypto from 'crypto'

const ANALYSIS_API_URL = process.env.ANALYSIS_API_URL || 'https://policy-analysis-api.vercel.app'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

interface DispatchPayload {
  policy_id: string
  client_id: string
  client_name: string
  client_industry: string
  file_url: string
  file_name: string
  file_size: number
  uploaded_by: string
  policy_type?: string
  renewal?: boolean
  priority?: string
  callback_url: string
}

interface DispatchResponse {
  success: boolean
  analysis_id: string
  message: string
  estimated_time_seconds: number
}

/**
 * Dispatch a policy to the Analysis API for processing
 */
export async function dispatchPolicyAnalysis(payload: DispatchPayload): Promise<DispatchResponse> {
  const webhookPayload = {
    event_type: 'policy.uploaded',
    ...payload,
  }

  // Sign the payload
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(webhookPayload))
    .digest('hex')

  const response = await fetch(`${ANALYSIS_API_URL}/webhook/policy-uploaded`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': `sha256=${signature}`,
    },
    body: JSON.stringify(webhookPayload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Analysis API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}

/**
 * Get the status of an analysis
 */
export async function getAnalysisStatus(analysisId: string) {
  const response = await fetch(`${ANALYSIS_API_URL}/analysis/${analysisId}/status`)

  if (!response.ok) {
    throw new Error(`Failed to get analysis status: ${response.status}`)
  }

  return response.json()
}

/**
 * Test connectivity to the Analysis API
 */
export async function testAnalysisApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/health`)
    return response.ok
  } catch {
    return false
  }
}
