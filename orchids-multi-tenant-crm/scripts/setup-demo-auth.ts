/**
 * One-time setup script: Create Supabase Auth users for demo accounts
 * and link them to existing `users` table records.
 *
 * Usage:
 *   cd orchids-multi-tenant-crm
 *   npx tsx scripts/setup-demo-auth.ts
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local since tsx doesn't do it automatically
function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const value = trimmed.slice(eqIdx + 1)
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local not found — rely on exported env vars
  }
}
loadEnvLocal()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('Run from orchids-multi-tenant-crm/ with .env.local present, or export the vars.')
  process.exit(1)
}

// Service-role client bypasses RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_PASSWORD = 'DemoPass123!'

const DEMO_USERS = [
  { email: 'john@acmecorp.com',   password: DEMO_PASSWORD },
  { email: 'sarah@acmecorp.com',  password: DEMO_PASSWORD },
  { email: 'mike@acmecorp.com',   password: DEMO_PASSWORD },
]

async function main() {
  console.log('=== Setting up demo auth users ===\n')

  for (const { email, password } of DEMO_USERS) {
    console.log(`Processing ${email}...`)

    // 1. Check if auth user already exists (list and filter by email)
    const { data: existingUsers, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) {
      console.error(`  Failed to list auth users: ${listErr.message}`)
      continue
    }

    const existing = existingUsers.users.find((u) => u.email === email)
    let authUserId: string

    if (existing) {
      console.log(`  Auth user already exists: ${existing.id}`)
      authUserId = existing.id
    } else {
      // 2. Create auth user
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm so they can log in immediately
      })

      if (createErr) {
        console.error(`  Failed to create auth user: ${createErr.message}`)
        continue
      }

      authUserId = created.user.id
      console.log(`  Created auth user: ${authUserId}`)
    }

    // 3. Link to users table by updating auth_user_id where email matches
    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('email', email)
      .select('id, email, full_name, role, tenant_id')

    if (updateErr) {
      console.error(`  Failed to update users table: ${updateErr.message}`)
      continue
    }

    if (!updated || updated.length === 0) {
      console.warn(`  No matching record in users table for ${email}`)
      continue
    }

    console.log(`  Linked to users record: ${updated[0].id} (${updated[0].full_name}, ${updated[0].role})`)
  }

  console.log('\n=== Demo login credentials ===\n')
  for (const { email, password } of DEMO_USERS) {
    console.log(`  Email:    ${email}`)
    console.log(`  Password: ${password}`)
    console.log()
  }

  console.log('Done. You can now log in at /login with any of the above credentials.')
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
