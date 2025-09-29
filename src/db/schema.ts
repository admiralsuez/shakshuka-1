import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email').unique(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id'),
  resetHour: integer('reset_hour').notNull().default(9),
  timezone: text('timezone').notNull().default('UTC'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  notes: text('notes'),
  dueHour: integer('due_hour'),
  isCompleted: integer('is_completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  completedAt: integer('completed_at'),
});

export const strikes = sqliteTable('strikes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  date: text('date').notNull(),
  note: text('note'),
  createdAt: integer('created_at').notNull(),
});

export const monthlyStats = sqliteTable('monthly_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  month: text('month').notNull(),
  strikesCount: integer('strikes_count').notNull().default(0),
  expiredCount: integer('expired_count').notNull().default(0),
  completedCount: integer('completed_count').notNull().default(0),
  tasksAddedCount: integer('tasks_added_count').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});