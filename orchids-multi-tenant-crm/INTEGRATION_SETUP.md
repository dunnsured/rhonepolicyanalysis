# SaaS + Policy Analysis API Integration Setup

This guide walks you through connecting your **Orchids Multi-Tenant CRM** (SaaS) with the **Policy Analysis API**.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ORCHIDS CRM (SaaS)                              │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Upload     │───▶│  /api/       │───▶│  Webhook Dispatch    │  │
│  │  Policy     │    │  policies/   │    │  to Analysis API     │  │
│  └─────────────┘    │  [id]/       │    └──────────────────────┘  │
│                     │  analyze     │             │                 │
│                     └──────────────┘             │                 │
│                                                  ▼                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Display    │◀───│  Supabase    │◀───│  /api/webhook/       │  │
│  │  Results    │    │  Database    │    │  analysis-complete   │  │
│  └─────────────┘    └──────────────┘    └──────────────────────┘  │
│                                                  ▲                 │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │
                                                   │ Callback
                                                   │
┌──────────────────────────────────────────────────┼─────────────────┐
│                     POLICY ANALYSIS API          │                 │
│                                                  │                 │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  Webhook    │───▶│  Claude      │───▶│  Send Results        │──┘
│  │  Receiver   │    │  Analysis    │    │  to Callback URL     │   │
│  └─────────────┘    └──────────────┘    └──────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Step 1: Database Migration

Run this SQL migration in your Supabase SQL Editor to add the analysis tracking fields:

```sql
-- Add analysis tracking fields to insurance_policies table
ALTER TABLE insurance_policies
ADD COLUMN IF NOT EXISTS analysis_id TEXT,
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS analysis_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS analysis_recommendation TEXT,
ADD COLUMN IF NOT EXISTS analysis_data JSONB,
ADD COLUMN IF NOT EXISTS analysis_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS analysis_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS analysis_error TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_id
ON insurance_policies(analysis_id) WHERE analysis_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_insurance_policies_analysis_status
ON insurance_policies(analysis_status) WHERE analysis_status IS NOT NULL;
```

## Step 2: Generate Webhook Secret

Both apps need to share a secret for webhook authentication. Generate one:

```bash
openssl rand -hex 32
```

Save this secret - you'll need it for both apps.

## Step 3: Configure Environment Variables

### SaaS Application (.env)

```env
# Existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=https://skulrnhjbxnahwzdyoir.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NEW: Application URL (your Vercel deployment)
NEXT_PUBLIC_APP_URL=https://orchids-multi-tenant-crm.vercel.app

# NEW: Analysis API Integration
NEXT_PUBLIC_ANALYSIS_API_URL=https://policy-analysis-api.vercel.app
WEBHOOK_SECRET=your-generated-secret-from-step-2
```

### Policy Analysis API (.env)

```env
# Existing config...
ANTHROPIC_API_KEY=your-anthropic-key

# NEW: Webhook authentication (same secret as SaaS)
WEBHOOK_SECRET=your-generated-secret-from-step-2
```

## Step 4: Deploy Updates

### Deploy SaaS to Vercel

```bash
cd orchids-multi-tenant-crm
npm install  # Install new dependencies (@supabase/auth-helpers-nextjs)
git add .
git commit -m "Add Policy Analysis API integration"
git push origin main
```

In Vercel Dashboard, add these environment variables:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ANALYSIS_API_URL`
- `WEBHOOK_SECRET`

### Deploy Analysis API

In your Analysis API's Vercel Dashboard, add:
- `WEBHOOK_SECRET` (same value as SaaS)

## Step 5: Test the Integration

1. **Login to the CRM** at your SaaS URL
2. **Go to a Company** → Policies tab
3. **Add a Cyber Liability policy** with a PDF attached
4. **Click "Analyze"** button on the policy row
5. **Watch the status** change: Processing → Analyzing → Completed
6. **See the score** appear once analysis completes

## How It Works

### Upload → Analysis Flow

1. User uploads a Cyber Liability policy with PDF
2. User clicks "Analyze" button
3. SaaS calls `POST /api/policies/[id]/analyze`
4. API route:
   - Gets a signed URL for the PDF from Supabase Storage
   - Updates policy status to "processing"
   - Dispatches webhook to Analysis API with signed URL
   - Analysis API returns an `analysis_id`
5. Analysis API downloads PDF, analyzes with Claude
6. When complete, Analysis API calls back to `POST /api/webhook/analysis-complete`
7. Callback handler updates the policy record with results
8. UI shows the updated status and score

### Files Created/Modified

```
src/
├── app/
│   └── api/
│       ├── policies/
│       │   └── [id]/
│       │       └── analyze/
│       │           └── route.ts      # Trigger analysis endpoint
│       └── webhook/
│           └── analysis-complete/
│               └── route.ts          # Receive results callback
├── components/
│   └── insurance-policies-section.tsx  # Updated with Analyze button
├── lib/
│   └── analysis-api.ts               # API client utilities
middleware.ts                          # Fixed auth middleware
```

## Troubleshooting

### "Analysis failed" error

1. Check Analysis API logs in Vercel Dashboard
2. Verify `ANTHROPIC_API_KEY` is set
3. Ensure PDF is accessible (signed URL valid for 1 hour)

### Webhook signature mismatch

1. Verify `WEBHOOK_SECRET` is identical in both apps
2. Check for trailing whitespace in env vars

### Callback not received

1. Verify `NEXT_PUBLIC_APP_URL` is correct
2. Check that `/api/webhook/analysis-complete` is accessible (not blocked by middleware)
3. Check Analysis API logs for callback errors

### Login redirect loop

1. Make sure `@supabase/auth-helpers-nextjs` is installed
2. Verify Supabase environment variables are set

## Security Notes

- The `WEBHOOK_SECRET` provides HMAC authentication for webhooks
- Signed URLs for PDFs expire after 1 hour
- The callback endpoint verifies signatures before processing
- Service role key is only used server-side, never exposed to client
