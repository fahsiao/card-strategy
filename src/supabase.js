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

// ── EXPENSE SPLITTING ──────────────────────────────────

export async function getTrips() {
  if (!supabase) return []
  const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false })
  if (error) { console.error('getTrips error:', error); return [] }
  return data
}

export async function createTrip(name) {
  if (!supabase) return null
  const { data, error } = await supabase.from('trips').insert({ name }).select().single()
  if (error) { console.error('createTrip error:', error); return null }
  return data
}

export async function updateTrip(id, name) {
  if (!supabase) return null
  const { data, error } = await supabase.from('trips').update({ name }).eq('id', id).select().single()
  if (error) { console.error('updateTrip error:', error); return null }
  return data
}

export async function deleteTrip(id) {
  if (!supabase) return
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) console.error('deleteTrip error:', error)
}

export async function getTripMembers(tripId) {
  if (!supabase) return []
  const { data, error } = await supabase.from('trip_members').select('*').eq('trip_id', tripId).order('created_at')
  if (error) { console.error('getTripMembers error:', error); return [] }
  return data
}

export async function addTripMember(tripId, name) {
  if (!supabase) return null
  const { data, error } = await supabase.from('trip_members').insert({ trip_id: tripId, name }).select().single()
  if (error) { console.error('addTripMember error:', error); return null }
  return data
}

export async function removeTripMember(tripId, id) {
  if (!supabase) return
  const { error } = await supabase.from('trip_members').delete().eq('id', id).eq('trip_id', tripId)
  if (error) console.error('removeTripMember error:', error)
}

export async function getExpenses(tripId) {
  if (!supabase) return []
  const { data, error } = await supabase.from('expenses').select('*').eq('trip_id', tripId).order('created_at', { ascending: false })
  if (error) { console.error('getExpenses error:', error); return [] }
  return data
}

export async function addExpense({ tripId, name, amount, paidBy, splitAmong, notes }) {
  if (!supabase) return null
  const { data, error } = await supabase.from('expenses').insert({ trip_id: tripId, name, amount, paid_by: paidBy, split_among: splitAmong, notes: notes || null }).select().single()
  if (error) { console.error('addExpense error:', error); return null }
  return data
}

export async function updateExpense(id, { name, amount, paidBy, splitAmong, notes }) {
  if (!supabase) return null
  const { data, error } = await supabase.from('expenses').update({ name, amount, paid_by: paidBy, split_among: splitAmong, notes: notes || null }).eq('id', id).select().single()
  if (error) { console.error('updateExpense error:', error); return null }
  return data
}

export async function deleteExpense(id) {
  if (!supabase) return
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) console.error('deleteExpense error:', error)
}

export function subscribeTrips(callback) {
  if (!supabase) return () => {}
  const ch = supabase.channel('trips-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, callback).subscribe()
  return () => supabase.removeChannel(ch)
}

// ── GROCERY LIST ──────────────────────────────────

export async function getGroceryItems() {
  if (!supabase) return []
  const { data, error } = await supabase.from('grocery_items').select('*').order('created_at', { ascending: true })
  if (error) { console.error('getGroceryItems error:', error); return [] }
  return data
}

export async function addGroceryItem(name) {
  if (!supabase) return null
  const { data, error } = await supabase.from('grocery_items').insert({ name }).select().single()
  if (error) { console.error('addGroceryItem error:', error); return null }
  return data
}

export async function updateGroceryItem(id, fields) {
  if (!supabase) return null
  const { data, error } = await supabase.from('grocery_items').update(fields).eq('id', id).select().single()
  if (error) { console.error('updateGroceryItem error:', error); return null }
  return data
}

export async function deleteGroceryItem(id) {
  if (!supabase) return
  const { error } = await supabase.from('grocery_items').delete().eq('id', id)
  if (error) console.error('deleteGroceryItem error:', error)
}

export async function clearCheckedGrocery() {
  if (!supabase) return
  const { error } = await supabase.from('grocery_items').delete().eq('checked', true)
  if (error) console.error('clearCheckedGrocery error:', error)
}

export function subscribeGrocery(callback) {
  if (!supabase) return () => {}
  const ch = supabase.channel('grocery-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, callback).subscribe()
  return () => supabase.removeChannel(ch)
}

export function subscribeTripData(tripId, onMembers, onExpenses) {
  if (!supabase) return () => {}
  const ch = supabase.channel(`trip-${tripId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members', filter: `trip_id=eq.${tripId}` }, onMembers)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, onExpenses)
    .subscribe()
  return () => supabase.removeChannel(ch)
}
