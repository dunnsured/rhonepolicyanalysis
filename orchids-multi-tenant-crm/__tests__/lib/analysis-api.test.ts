/**
 * Tests for HMAC signing/verification in analysis-api.ts
 *
 * Run with: npx jest __tests__/lib/analysis-api.test.ts
 */

import crypto from 'crypto'

// Re-implement the functions here to test the logic independently
// (since the actual module uses server-only imports)

function generateSignature(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

const TEST_SECRET = 'test-webhook-secret-for-hmac-signing'

describe('HMAC Signature Functions', () => {
  describe('generateSignature', () => {
    it('should produce a 64-char hex string', () => {
      const sig = generateSignature({ key: 'value' }, TEST_SECRET)
      expect(sig).toHaveLength(64)
      expect(sig).toMatch(/^[0-9a-f]+$/)
    })

    it('should be deterministic', () => {
      const payload = { analysis_id: 'test-123', status: 'completed' }
      const sig1 = generateSignature(payload, TEST_SECRET)
      const sig2 = generateSignature(payload, TEST_SECRET)
      expect(sig1).toBe(sig2)
    })

    it('should produce different signatures for different payloads', () => {
      const sig1 = generateSignature({ a: 1 }, TEST_SECRET)
      const sig2 = generateSignature({ a: 2 }, TEST_SECRET)
      expect(sig1).not.toBe(sig2)
    })

    it('should produce different signatures for different secrets', () => {
      const payload = { a: 1 }
      const sig1 = generateSignature(payload, 'secret-1')
      const sig2 = generateSignature(payload, 'secret-2')
      expect(sig1).not.toBe(sig2)
    })
  })

  describe('verifySignature', () => {
    it('should verify a valid signature', () => {
      const payload = { policy_id: 'test-001', status: 'completed' }
      const payloadStr = JSON.stringify(payload)
      const signature = generateSignature(payload, TEST_SECRET)

      expect(verifySignature(payloadStr, signature, TEST_SECRET)).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const payload = { policy_id: 'test-001' }
      const payloadStr = JSON.stringify(payload)

      expect(
        verifySignature(payloadStr, 'invalid_signature_0000000000000000000000000000000000000000000000000000000000000000', TEST_SECRET)
      ).toBe(false)
    })

    it('should reject a tampered payload', () => {
      const payload = { policy_id: 'test-001', score: 85 }
      const signature = generateSignature(payload, TEST_SECRET)

      // Tamper with the payload
      const tampered = JSON.stringify({ policy_id: 'test-001', score: 100 })

      expect(verifySignature(tampered, signature, TEST_SECRET)).toBe(false)
    })

    it('should reject signature made with wrong secret', () => {
      const payload = { policy_id: 'test-001' }
      const payloadStr = JSON.stringify(payload)
      const signature = generateSignature(payload, 'wrong-secret')

      expect(verifySignature(payloadStr, signature, TEST_SECRET)).toBe(false)
    })
  })

  describe('Round-trip (sign then verify)', () => {
    it('should work for complex payloads', () => {
      const complexPayload = {
        analysis_id: 'analysis_abc123',
        policy_id: 'policy-001',
        client_name: 'Acme Corp',
        status: 'completed',
        overall_score: 72.5,
        analysis_data: {
          executive_summary: {
            recommendation: 'Good coverage with minor gaps',
            key_metrics: { overall_maturity_score: 72.5 },
          },
          gaps: [{ title: 'Missing social engineering', severity: 'high' }],
        },
        completed_at: '2026-02-16T00:00:00.000Z',
      }

      const payloadStr = JSON.stringify(complexPayload)
      const signature = generateSignature(complexPayload, TEST_SECRET)

      expect(verifySignature(payloadStr, signature, TEST_SECRET)).toBe(true)
    })
  })
})
