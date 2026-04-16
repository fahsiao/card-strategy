import { pgTable, text, integer, boolean, timestamp, bigserial, uuid, numeric, jsonb } from 'drizzle-orm/pg-core'

export const balances = pgTable('balances', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  value: integer('value').default(0),
  color: text('color'),
  isSystem: boolean('is_system').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const turns = pgTable('turns', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  bucket: text('bucket').notNull(),
  person: text('person').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).defaultNow(),
})

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const tripMembers = pgTable('trip_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tripId: uuid('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: numeric('amount').notNull(),
  paidBy: text('paid_by').notNull(),
  splitAmong: jsonb('split_among').notNull().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const groceryItems = pgTable('grocery_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  checked: boolean('checked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
