const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// ── BALANCES ──────────────────────────────────

export async function getBalances() {
  try {
    const res = await fetch('/api/balances')
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getBalances error:', err); return null }
}

export async function upsertBalance(balance) {
  try {
    await fetch('/api/balances', json('PUT', {
      id: balance.id, label: balance.label, value: balance.value,
      color: balance.color, is_system: balance.sys || false, updated_at: balance.updated,
    }))
  } catch (err) { console.error('upsertBalance error:', err) }
}

export async function deleteBalance(id) {
  try { await fetch('/api/balances', json('DELETE', { id })) }
  catch (err) { console.error('deleteBalance error:', err) }
}

// ── TURNS ──────────────────────────────────

export async function getTurns() {
  try {
    const res = await fetch('/api/turns')
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getTurns error:', err); return null }
}

export async function logTurn(bucket, person) {
  try {
    const res = await fetch('/api/turns', json('POST', { bucket, person }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('logTurn error:', err); return null }
}

export async function deleteTurn(id) {
  try { await fetch('/api/turns', json('DELETE', { id })) }
  catch (err) { console.error('deleteTurn error:', err) }
}

// ── TRIPS ──────────────────────────────────

export async function getTrips() {
  try {
    const res = await fetch('/api/trips')
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getTrips error:', err); return [] }
}

export async function createTrip(name) {
  try {
    const res = await fetch('/api/trips', json('POST', { name }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('createTrip error:', err); return null }
}

export async function updateTrip(id, name) {
  try {
    const res = await fetch('/api/trips', json('PUT', { id, name }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('updateTrip error:', err); return null }
}

export async function deleteTrip(id) {
  try { await fetch('/api/trips', json('DELETE', { id })) }
  catch (err) { console.error('deleteTrip error:', err) }
}

// ── TRIP MEMBERS ──────────────────────────────────

export async function getTripMembers(tripId) {
  try {
    const res = await fetch(`/api/trip-members?tripId=${tripId}`)
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getTripMembers error:', err); return [] }
}

export async function addTripMember(tripId, name) {
  try {
    const res = await fetch('/api/trip-members', json('POST', { trip_id: tripId, name }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('addTripMember error:', err); return null }
}

export async function removeTripMember(tripId, id) {
  try { await fetch('/api/trip-members', json('DELETE', { id, trip_id: tripId })) }
  catch (err) { console.error('removeTripMember error:', err) }
}

// ── EXPENSES ──────────────────────────────────

export async function getExpenses(tripId) {
  try {
    const res = await fetch(`/api/expenses?tripId=${tripId}`)
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getExpenses error:', err); return [] }
}

export async function addExpense({ tripId, name, amount, paidBy, splitAmong, notes }) {
  try {
    const res = await fetch('/api/expenses', json('POST', { trip_id: tripId, name, amount, paid_by: paidBy, split_among: splitAmong, notes: notes || null }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('addExpense error:', err); return null }
}

export async function updateExpense(id, { name, amount, paidBy, splitAmong, notes }) {
  try {
    const res = await fetch('/api/expenses', json('PUT', { id, name, amount, paid_by: paidBy, split_among: splitAmong, notes: notes || null }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('updateExpense error:', err); return null }
}

export async function deleteExpense(id) {
  try { await fetch('/api/expenses', json('DELETE', { id })) }
  catch (err) { console.error('deleteExpense error:', err) }
}

// ── GROCERY ──────────────────────────────────

export async function getGroceryItems() {
  try {
    const res = await fetch('/api/grocery')
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('getGroceryItems error:', err); return [] }
}

export async function addGroceryItem(name) {
  try {
    const res = await fetch('/api/grocery', json('POST', { name }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('addGroceryItem error:', err); return null }
}

export async function updateGroceryItem(id, fields) {
  try {
    const res = await fetch('/api/grocery', json('PUT', { id, ...fields }))
    if (!res.ok) throw new Error(res.statusText)
    return await res.json()
  } catch (err) { console.error('updateGroceryItem error:', err); return null }
}

export async function deleteGroceryItem(id) {
  try { await fetch('/api/grocery', json('DELETE', { id })) }
  catch (err) { console.error('deleteGroceryItem error:', err) }
}

export async function clearCheckedGrocery() {
  try { await fetch('/api/grocery', json('DELETE', { clearChecked: true })) }
  catch (err) { console.error('clearCheckedGrocery error:', err) }
}
