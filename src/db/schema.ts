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

export const tasksV2 = sqliteTable('tasks_v2', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags', { mode: 'json' }),
});

export const strikes = sqliteTable('strikes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => tasksV2.id),
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

export const userTasks = sqliteTable('user_tasks_v2', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags'),
  userId: integer('user_id').notNull().references(() => users.id),
});

export const taskItems = sqliteTable('task_items', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags'),
});

export const cleanTasks = sqliteTable('clean_tasks', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags'),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags'),
});

export const userIsolatedTasks = sqliteTable('user_isolated_tasks', {
  id: text('id').primaryKey(),
  revision: integer('revision').notNull().default(1),
  title: text('title').notNull(),
  notes: text('notes'),
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  dueHour: integer('due_hour'),
  dueDate: text('due_date'),
  tags: text('tags'),
  userId: integer('user_id').notNull().references(() => users.id),
});