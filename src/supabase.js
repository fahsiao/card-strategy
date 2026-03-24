import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase env vars. Running in local-only mode.')
}

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Fetch all balances
export async function getBalances() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('getBalances error:', error); return null }
  return data
}

// Upsert a single balance row
export async function upsertBalance(balance) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('balances')
    .upsert({
      id: balance.id,
      label: balance.label,
      value: balance.value,
      color: balance.color,
      is_system: balance.sys || false,
      updated_at: balance.updated,
    }, { onConflict: 'id' })
  if (error) console.error('upsertBalance error:', error)
  return data
}

// Delete a balance row
export async function deleteBalance(id) {
  if (!supabase) return null
  const { error } = await supabase
    .from('balances')
    .delete()
    .eq('id', id)
  if (error) console.error('deleteBalance error:', error)
}

// Subscribe to real-time changes
export function subscribeBalances(callback) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('balances-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'balances' },
      (payload) => { callback(payload) }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// ── TURNS TRACKING ──────────────────────────────────

// Fetch turns for a bucket
export async function getTurns() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('turns')
    .select('*')
    .order('paid_at', { ascending: false })
    .limit(50)
  if (error) { console.error('getTurns error:', error); return null }
  return data
}

// Log a turn
export async function logTurn(bucket, person) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('turns')
    .insert({ bucket, person, paid_at: new Date().toISOString() })
  if (error) console.error('logTurn error:', error)
  return data
}

// Delete a turn (undo)
export async function deleteTurn(id) {
  if (!supabase) return null
  const { error } = await supabase
    .from('turns')
    .delete()
    .eq('id', id)
  if (error) console.error('deleteTurn error:', error)
}

// Subscribe to real-time turns changes
export function subscribeTurns(callback) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('turns-realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'turns' },
      (payload) => { callback(payload) }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
