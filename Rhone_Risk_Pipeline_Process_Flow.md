# High-Level Process Flow & Tools Map

**Rhône Risk — Cyber Policy Analysis Pipeline**

---

## End-to-End Pipeline — Master Flow

Six core processes, each with specific tools and technologies. The entire pipeline runs automatically once a user uploads a policy PDF.

```mermaid
flowchart TB
    P1["🔼 PROCESS 1<br/><b>Upload & Store</b><br/>User uploads PDF to CRM"]
    P2["⚡ PROCESS 2<br/><b>Trigger & Dispatch</b><br/>CRM triggers Railway API"]
    P3["📄 PROCESS 3<br/><b>Extract (ETL)</b><br/>PDF → Structured Text"]
    P4["🧠 PROCESS 4<br/><b>AI Analysis</b><br/>Two-Phase Claude Scoring"]
    P5["📊 PROCESS 5<br/><b>Report Generation</b><br/>Branded PDF Creation"]
    P6["📤 PROCESS 6<br/><b>Deliver Results</b><br/>Callback + UI Update"]

    P1 --> P2 --> P3 --> P4 --> P5 --> P6

    P1 ~~~ T1["<b>Tools:</b> React, Supabase Storage,<br/>Supabase DB"]
    P2 ~~~ T2["<b>Tools:</b> Next.js API Routes,<br/>HMAC-SHA256, Supabase Signed URLs"]
    P3 ~~~ T3["<b>Tools:</b> pdfplumber (Python),<br/>aiohttp"]
    P4 ~~~ T4["<b>Tools:</b> Anthropic API,<br/>Claude Haiku + Sonnet,<br/>PyYAML"]
    P5 ~~~ T5["<b>Tools:</b> reportlab (Python)"]
    P6 ~~~ T6["<b>Tools:</b> aiohttp, Supabase JS,<br/>React (real-time UI)"]

    style P1 fill:#3b82f6,color:#fff
    style P2 fill:#8b5cf6,color:#fff
    style P3 fill:#059669,color:#fff
    style P4 fill:#d97706,color:#fff
    style P5 fill:#dc2626,color:#fff
    style P6 fill:#0891b2,color:#fff

    style T1 fill:#dbeafe,color:#1e3a5f,stroke:none
    style T2 fill:#ede9fe,color:#1e3a5f,stroke:none
    style T3 fill:#d1fae5,color:#1e3a5f,stroke:none
    style T4 fill:#fef3c7,color:#1e3a5f,stroke:none
    style T5 fill:#fee2e2,color:#1e3a5f,stroke:none
    style T6 fill:#cffafe,color:#1e3a5f,stroke:none
```

### Tool Legend

| Category | Description |
|----------|-------------|
| **Next.js / React** | CRM Frontend (Vercel) |
| **Supabase** | Database + File Storage |
| **Python** | Railway Backend Services |
| **Claude API** | Anthropic AI Models |
| **reportlab** | PDF Report Generation |
| **HTTP / Webhooks** | Service Communication |

---

## Process 1 — Upload & Store

### ① Upload & Store the Policy PDF

**Tools:** `React` · `Supabase Storage` · `Supabase DB (PostgreSQL)`

User selects a PDF in the CRM. The file is uploaded to Supabase Storage and a record is inserted into the `insurance_policies` table with the storage path.

```mermaid
sequenceDiagram
    actor User
    participant UI as React Component<br/>(insurance-policies-section.tsx)
    participant Store as Supabase Storage<br/>(insurance-policies bucket)
    participant DB as Supabase DB<br/>(insurance_policies table)

    User->>UI: Select PDF + click "Add Policy"
    UI->>Store: Upload PDF binary<br/>Path: {tenant_id}/{company_id}/{timestamp}-{file}
    Store-->>UI: ✅ storage_path confirmed
    UI->>DB: INSERT INTO insurance_policies<br/>(carrier_name, line_of_coverage,<br/>storage_path, file_name, file_size)
    DB-->>UI: ✅ Record created (id = uuid)
    UI-->>User: Policy appears in list
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **React** `insurance-policies-section.tsx` | Renders upload form, handles file selection, manages UI state | User's browser |
| **Supabase Storage SDK** `@supabase/supabase-js` | Uploads PDF binary to the `insurance-policies` bucket | User's browser → Supabase |
| **Supabase DB** PostgreSQL via JS client | Inserts policy metadata record (carrier, coverage line, file path, etc.) | User's browser → Supabase |

---

## Process 2 — Trigger & Dispatch

### ② Trigger Analysis & Dispatch to Railway

**Tools:** `Next.js API Route` · `Supabase DB` · `Supabase Signed URLs` · `HMAC-SHA256` · `fetch (HTTP POST)`

After upload, the CRM fires a POST to its own API. The API route looks up the policy, generates a time-limited signed URL for the PDF, signs the entire payload with HMAC-SHA256, and sends it to Railway.

```mermaid
sequenceDiagram
    participant UI as React Component
    participant API as Next.js API Route<br/>(/api/policies/[id]/analyze)
    participant DB as Supabase DB
    participant Store as Supabase Storage
    participant Lib as analysis-api.ts
    participant Rail as Railway API<br/>(/webhook/policy-uploaded)

    UI->>API: POST /api/policies/{id}/analyze
    API->>DB: SELECT policy + company (name, industry)
    DB-->>API: Policy record + company details

    API->>Store: createSignedUrl(storage_path, 3600)
    Store-->>API: Signed URL (valid 1 hour)

    API->>DB: UPDATE status → "processing"

    API->>Lib: dispatchPolicyAnalysis(payload)
    Note over Lib: Payload includes:<br/>policy_id, client_name,<br/>client_industry, file_url,<br/>callback_url

    Lib->>Lib: signature = HMAC-SHA256(payload, SECRET)
    Lib->>Rail: POST /webhook/policy-uploaded<br/>Header: X-Webhook-Signature: sha256={sig}<br/>Body: JSON payload

    Rail-->>Lib: 200 OK { analysis_id, estimated_time }
    Lib-->>API: DispatchResponse
    API->>DB: UPDATE analysis_id, status → "analyzing"
    API-->>UI: { success: true, analysis_id }
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **Next.js API Route** `/api/policies/[id]/analyze/route.ts` | Server-side route that orchestrates the dispatch: fetches policy, gets signed URL, calls library | Vercel serverless function |
| **Supabase DB** via `@supabase/supabase-js` (service role) | Reads policy + company details, updates `analysis_status` at each stage | Vercel → Supabase |
| **Supabase Storage** `createSignedUrl()` | Generates a 1-hour presigned URL so Railway can download the PDF without direct access | Vercel → Supabase |
| **Node.js `crypto`** (HMAC-SHA256) | Signs the JSON payload so Railway can verify the request is legitimate | Vercel serverless function |
| **fetch** (HTTP POST) | Sends the signed webhook payload to Railway's `/webhook/policy-uploaded` endpoint | Vercel → Railway |
| **analysis-api.ts** | Shared library that wraps signature generation + dispatch + status check into clean functions | Vercel serverless function |

---

## Process 3 — Extract (ETL: PDF → Structured Text)

### ③ Download PDF & Extract Text

**Tools:** `FastAPI` · `aiohttp` · `pdfplumber`

Railway receives the webhook, downloads the PDF from the signed URL, and uses pdfplumber to extract every page's text and tables. The output is structured text with page markers.

```mermaid
sequenceDiagram
    participant WH as webhook.py<br/>(FastAPI Router)
    participant ORC as orchestrator.py<br/>(Background Task)
    participant DL as aiohttp<br/>(HTTP Client)
    participant Store as Supabase Storage<br/>(Signed URL)
    participant PDF as pdf_extractor.py<br/>(pdfplumber)

    WH->>WH: Generate analysis_id<br/>(analysis_{uuid})
    WH->>ORC: BackgroundTasks.add_task(<br/>run_policy_analysis)
    WH-->>WH: Return 200 immediately

    Note over ORC: Background execution starts

    ORC->>DL: GET {signed_url}
    DL->>Store: Download PDF binary
    Store-->>DL: PDF bytes
    DL-->>ORC: Save to temp/{uuid}.pdf

    ORC->>PDF: extract_from_file(temp_path)
    PDF->>PDF: pdfplumber.open(file)
    loop Every page
        PDF->>PDF: page.extract_text()
        PDF->>PDF: page.extract_tables()
        PDF->>PDF: Append "--- Page N ---\n{text}"
    end
    PDF->>PDF: Quality check (min 500 chars)
    PDF-->>ORC: ExtractionResult<br/>(text, page_count, pages[], tables[])
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **FastAPI** `webhook.py` | Receives the HTTP POST, validates payload shape via Pydantic model, queues background task | Railway container |
| **FastAPI BackgroundTasks** | Runs the analysis pipeline asynchronously so the webhook returns immediately (non-blocking) | Railway container |
| **aiohttp** (async HTTP client) | Downloads the PDF from the Supabase signed URL to Railway's local filesystem | Railway → Supabase Storage |
| **pdfplumber** `pdf_extractor.py` | Opens the PDF and extracts text + tables page-by-page with layout preservation. Produces structured text with `--- Page N ---` markers. | Railway container |
| **Pydantic** `PolicyUploadedPayload` | Validates incoming webhook payload structure (required fields, URL format, types) | Railway container |

### Output Format (ExtractionResult)

| Field | Type | Description |
|-------|------|-------------|
| `success` | bool | Whether extraction succeeded |
| `text` | str | All pages joined with `--- Page N ---` markers |
| `page_count` | int | Total number of pages in the PDF |
| `pages` | List[Dict] | Per-page text with page number and char count |
| `tables` | List[Dict] | Extracted tables with page number and row data |

---

## Process 4 — AI Analysis (Two-Phase Claude Scoring)

### ④ Two-Phase Claude AI Analysis

**Tools:** `Claude Haiku 4.5` · `Claude Sonnet 4` · `anthropic SDK` · `PyYAML` · `system_prompt.py (8 modules)`

The extracted text goes through two AI passes. Phase 1 (Haiku) extracts structured data. Phase 2 (Sonnet) applies the full scoring methodology and produces a complete YAML analysis with scores, red flags, and recommendations.

```mermaid
sequenceDiagram
    participant ORC as orchestrator.py
    participant CA as claude_analyzer.py
    participant SP as system_prompt.py<br/>(8 Modules)
    participant H as Claude Haiku 4.5<br/>(Extraction Model)
    participant S as Claude Sonnet 4<br/>(Analysis Model)
    participant PP as Post-Processing<br/>(Parse + Enrich + Validate)

    ORC->>CA: analyze_policy_two_phase(<br/>policy_text, client_name,<br/>client_industry, is_renewal)

    Note over CA,H: ── PHASE 1: EXTRACTION ──

    CA->>SP: get_extraction_prompt()
    SP-->>CA: 6-section extraction template
    CA->>H: messages.create(<br/>model: haiku-4.5,<br/>max_tokens: 8192,<br/>system: extraction_prompt,<br/>user: raw_policy_text)
    H-->>CA: Structured markdown<br/>(declarations, agreements,<br/>definitions, exclusions,<br/>conditions, forms)

    Note over CA,S: ── PHASE 2: SCORING ──

    CA->>SP: get_analysis_prompt(<br/>industry, is_renewal)
    SP->>SP: Assemble 8 modules:<br/>1. Role Identity<br/>2. 14 Coverage Categories<br/>3. 5-Factor Scoring<br/>4. Industry Criteria<br/>5. Red Flags Library<br/>6. Additional Features<br/>7. YAML Output Schema<br/>+ Renewal note (if applicable)
    SP-->>CA: Complete analysis prompt (~6K tokens)

    CA->>S: messages.create(<br/>model: sonnet-4,<br/>max_tokens: 16384,<br/>system: analysis_prompt,<br/>user: extracted_data)
    S-->>CA: Full YAML analysis output

    Note over CA,PP: ── POST-PROCESSING ──

    CA->>PP: _parse_yaml_or_json(raw_output)
    PP->>PP: Try YAML → JSON → code block<br/>→ embedded object (5 layers)
    PP-->>CA: Parsed dict

    CA->>PP: _enrich_analysis(data)
    PP->>PP: Compute weighted maturity score,<br/>classify maturity level, add metadata
    PP-->>CA: Enriched dict

    CA->>PP: _validate_analysis(data)
    PP->>PP: Check: sections ≥10?,<br/>scored items ≥30?,<br/>recommendation present?
    PP-->>CA: Validation result

    CA-->>ORC: AnalysisResult<br/>(success, analysis_data,<br/>tokens_used, extracted_data)
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **Claude Haiku 4.5** `claude-haiku-4-5-20251001` | **Phase 1 — Data Extraction.** Reads raw PDF text and extracts structured data into clean markdown (declarations, insuring agreements, definitions, exclusions, conditions, schedule of forms). Fast and cost-efficient (~$0.01/call). | Anthropic API |
| **Claude Sonnet 4** `claude-sonnet-4-20250514` | **Phase 2 — Scoring & Analysis.** Takes the clean extraction and applies the full Rhône Risk methodology: 5-factor scoring per item, 5-dimension maturity, red flag detection, industry-specific analysis, binding recommendation. Produces complete YAML output (~$0.15-0.25/call). | Anthropic API |
| **anthropic** Python SDK | API client that sends messages to Claude models and receives responses. Handles authentication, retries, and token counting. | Railway container |
| **system_prompt.py** (8 modules) | Modular prompt assembly system with 3 functions. Modules: Role Identity, Coverage Categories (14), Scoring Methodology (5-factor + 5-dimension), Industry Criteria (8 industries), Red Flags Library (13 flags), Additional Features (10), YAML Output Format (full schema), Few-Shot Example (CNA/FSI truncated). | Railway container |
| **PyYAML** `yaml.safe_load()` | Primary output parser — Claude returns YAML and PyYAML parses it into a Python dictionary. Falls back through 4 additional parsing strategies if YAML fails. | Railway container |
| **json** (stdlib) | Fallback output parser if Claude returns JSON instead of YAML. | Railway container |
| **re** (stdlib) | Regex-based extraction — finds YAML/JSON content inside code fences or embedded objects when standard parsing fails. | Railway container |

### Prompt Module Breakdown (system_prompt.py — 1,186 lines)

| Module | ~Tokens | Purpose | Used In |
|--------|---------|---------|---------|
| `ROLE_IDENTITY` | 220 | Analyst persona and analysis principles | Phase 2 + Single-pass |
| `COVERAGE_CATEGORIES` | 900 | 14 categories with ~60 sub-items to evaluate | Phase 2 + Single-pass |
| `SCORING_METHODOLOGY` | 890 | 5-factor per-item scoring + 5-dimension maturity framework | Phase 2 + Single-pass |
| `INDUSTRY_CRITERIA` | ~500 each | 8 industry-specific modules with heightened scrutiny areas | Phase 2 + Single-pass (one selected) |
| `RED_FLAGS` | 775 | 13 red flags with severity levels and score impact | Phase 2 + Single-pass |
| `ADDITIONAL_FEATURES` | 300 | 10 policy-wide features (prior acts, pay-on-behalf, hammer clause, etc.) | Phase 2 + Single-pass |
| `YAML_OUTPUT_FORMAT` | 2,100 | Complete YAML schema defining exact output structure | Phase 2 + Single-pass |
| `FEW_SHOT_EXAMPLE` | 1,000 | Truncated real CNA/FSI analysis as quality reference | Single-pass only |

---

## Process 5 — Report Generation (Branded PDF)

### ⑤ Generate Branded PDF Report

**Tools:** `reportlab` · `Python (report_generator.py)`

The structured analysis data (YAML/dict) is rendered into a multi-page branded PDF using reportlab. The report includes a cover page, executive summary, coverage tables, red flags, and recommendations — all in Rhône Risk brand colors.

```mermaid
flowchart LR
    A["Analysis Data<br/>(Python dict from<br/>YAML parsing)"] --> B["report_generator.py"]

    subgraph "ReportGenerator Class"
        B --> S1["_create_cover_page()<br/>Logo, client info,<br/>score badge, rec badge"]
        S1 --> S2["_create_executive_summary()<br/>Overview, metrics table,<br/>action items, rationale"]
        S2 --> S3["_create_coverage_analysis()<br/>First-party coverage table,<br/>Third-party coverage table"]
        S3 --> S4["_create_red_flags_section()<br/>HIGH/MEDIUM severity flags,<br/>deficiencies, concerns"]
        S4 --> S5["_create_recommendations()<br/>Immediate actions,<br/>renewal items, risk mgmt"]
    end

    S5 --> C["SimpleDocTemplate.build()"]
    C --> D["📄 {ClientName}_Policy_Analysis_{timestamp}.pdf"]

    style A fill:#d97706,color:#fff
    style D fill:#162B4D,color:#fff
    style S1 fill:#162B4D,color:#fff
    style S4 fill:#DC3545,color:#fff
    style S5 fill:#28A745,color:#fff
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **reportlab** `SimpleDocTemplate` | Core PDF engine — creates the document with page size (US Letter), margins, and page flow | Railway container |
| **reportlab** `Paragraph` | Renders formatted text blocks (titles, body text, bullet points) with custom paragraph styles | Railway container |
| **reportlab** `Table` + `TableStyle` | Creates formatted data tables (key metrics, coverage scores) with Rhône Risk branded styling | Railway container |
| **reportlab** `HRFlowable` | Renders horizontal rules (dividers) between sections in the accent color | Railway container |
| **reportlab** `colors.HexColor` | Defines all Rhône Risk brand colors: Navy (#162B4D), Cyan (#0CBDDB), success/warning/danger | Railway container |
| **Python `os`** | Creates the `reports/` output directory, generates safe filenames from client name + timestamp | Railway container |

---

## Process 6 — Deliver Results (Callback + UI Update)

### ⑥ Send Results Back & Update UI

**Tools:** `aiohttp (HTTP POST)` · `Next.js Webhook Route` · `HMAC-SHA256 Verification` · `Supabase DB` · `React (UI refresh)`

Railway sends the complete results (score, recommendation, full analysis data, report path) back to the CRM's webhook endpoint. The CRM verifies the signature, saves everything to Supabase, and the UI refreshes to show the score badge and recommendation.

```mermaid
sequenceDiagram
    participant ORC as orchestrator.py<br/>(Railway)
    participant CB as aiohttp<br/>(HTTP Client)
    participant WH as /api/webhook/<br/>analysis-complete<br/>(Vercel)
    participant DB as Supabase DB
    participant UI as React Component<br/>(User's Browser)

    ORC->>ORC: Build result payload:<br/>analysis_id, policy_id,<br/>overall_score, recommendation,<br/>analysis_data, report_path,<br/>processing_time

    ORC->>CB: POST callback_url<br/>Body: JSON result
    CB->>WH: POST /api/webhook/analysis-complete

    WH->>WH: Verify HMAC signature
    WH->>WH: Parse AnalysisResult

    WH->>DB: UPDATE insurance_policies SET<br/>analysis_status = 'completed',<br/>analysis_score = X.X,<br/>analysis_recommendation = 'BIND',<br/>analysis_data = {full JSON},<br/>analysis_completed_at = NOW()

    DB-->>WH: ✅ Updated
    WH-->>CB: 200 OK
    CB-->>ORC: Callback sent successfully

    Note over UI: UI polls or receives<br/>Supabase Realtime update

    UI->>DB: Fetch updated policy
    DB-->>UI: Updated record
    UI-->>UI: Render: score badge (7.2/10),<br/>recommendation badge (BIND),<br/>download report button
```

| Tool / Technology | Role in This Process | Runs On |
|-------------------|---------------------|---------|
| **aiohttp** `_send_callback()` | Sends the full analysis result as an HTTP POST to the CRM's callback URL with a 30-second timeout | Railway → Vercel |
| **Next.js API Route** `/api/webhook/analysis-complete/route.ts` | Receives the callback, verifies HMAC signature, parses the result, and writes to Supabase | Vercel serverless function |
| **Node.js `crypto`** `verifySignature()` | Validates the incoming callback's HMAC-SHA256 signature using timing-safe comparison | Vercel serverless function |
| **Supabase DB** `.update()` | Writes final results to the `insurance_policies` record: score, recommendation, full analysis JSON, completion timestamp | Vercel → Supabase |
| **React** (UI refresh) | User sees updated policy card with color-coded maturity score badge and recommendation label | User's browser |

---

## Summary — All Tools by Process

| Process | Tools Used | Runs On | Duration |
|---------|-----------|---------|----------|
| **1. Upload & Store** | React, Supabase Storage, Supabase DB | Browser + Supabase | 2-5 seconds |
| **2. Trigger & Dispatch** | Next.js Route, Supabase DB, Signed URLs, HMAC-SHA256, fetch, analysis-api.ts | Vercel → Railway | 1-3 seconds |
| **3. Extract (ETL)** | FastAPI, aiohttp, pdfplumber, Pydantic | Railway | 5-15 seconds |
| **4. AI Analysis** | Claude Haiku 4.5, Claude Sonnet 4, anthropic SDK, system_prompt.py, PyYAML | Railway → Anthropic | 40-110 seconds |
| **5. Report Gen** | reportlab, Python (os, datetime) | Railway | 3-8 seconds |
| **6. Deliver Results** | aiohttp, Next.js Route, HMAC verify, Supabase DB, React | Railway → Vercel → Supabase | 1-2 seconds |
| **TOTAL** | **15 distinct tools/technologies across 3 services** | | **~52-143 seconds** |

---

*Rhône Risk Advisory — Process Flow & Tools Map*
*February 2026 — Confidential*
