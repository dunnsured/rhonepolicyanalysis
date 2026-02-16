import crypto from 'crypto'

const ANALYSIS_API_URL = process.env.NEXT_PUBLIC_ANALYSIS_API_URL || 'https://policy-analysis-api-production.up.railway.app'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || ''

export interface DispatchPayload {
  policy_id: string
  tenant_id?: string
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

export interface DispatchResponse {
  success: boolean
  analysis_id: string
  message: string
  estimated_time_seconds: number
}

export interface AnalysisResult {
  analysis_id: string
  policy_id: string
  client_id: string
  client_name: string
  status: 'completed' | 'failed'
  overall_score?: number
  recommendation?: string
  report_path?: string
  report_storage_path?: string
  analysis_data?: Record<string, unknown>
  error_message?: string
  completed_at: string
  processing_time_seconds?: number
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
}

/**
 * Verify webhook signature
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
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
  const signature = generateSignature(webhookPayload, WEBHOOK_SECRET)

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
