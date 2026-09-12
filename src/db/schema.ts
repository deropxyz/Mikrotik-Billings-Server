import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  decimal,
  timestamp,
  json,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum('UserRole', ['ADMIN']);

export const customerStatusEnum = pgEnum('CustomerStatus', [
  'ACTIVE',
  'INACTIVE',
]);

export const serviceStatusEnum = pgEnum('ServiceStatus', [
  'ACTIVE',
  'THROTTLED',
  'SUSPENDED',
  'TERMINATED',
]);

export const invoiceStatusEnum = pgEnum('InvoiceStatus', [
  'UNPAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const paymentStatusEnum = pgEnum('PaymentStatus', [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'CANCELLED',
]);

export const networkSessionStatusEnum = pgEnum('NetworkSessionStatus', [
  'ONLINE',
  'OFFLINE',
]);

// ============================================================
// TABLES
// ============================================================

// ---- User ----
export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  role: userRoleEnum('role').default('ADMIN').notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

// ---- Package ----
export const packages = pgTable('Package', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  speedMbps: integer('speedMbps').notNull(),
  monthlyPrice: decimal('monthlyPrice', { precision: 12, scale: 2 }).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

// ---- Router ----
export const routers = pgTable('Router', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  model: text('model').notNull(),
  routerOsVersion: text('routerOsVersion').notNull(),
  host: text('host').notNull().unique(),
  apiPort: integer('apiPort').default(8728).notNull(),
  isActive: boolean('isActive').default(true).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

// ---- Customer ----
export const customers = pgTable(
  'Customer',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    address: text('address').notNull(),
    zone: text('zone').notNull(),
    status: customerStatusEnum('status').default('ACTIVE').notNull(),
    serviceStatus: serviceStatusEnum('serviceStatus').default('ACTIVE').notNull(),
    packageId: text('packageId')
      .notNull()
      .references(() => packages.id),
    routerId: text('routerId')
      .notNull()
      .references(() => routers.id),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('Customer_name_idx').on(table.name),
    index('Customer_status_serviceStatus_idx').on(table.status, table.serviceStatus),
  ],
);

// ---- PPPoEAccount ----
export const pppoeAccounts = pgTable('PPPoEAccount', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  username: text('username').notNull().unique(),
  secretRef: text('secretRef'),
  isEnabled: boolean('isEnabled').default(true).notNull(),
  customerId: text('customerId')
    .notNull()
    .unique()
    .references(() => customers.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
});

// ---- Invoice ----
export const invoices = pgTable(
  'Invoice',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    invoiceNo: text('invoiceNo').notNull().unique(),
    customerId: text('customerId')
      .notNull()
      .references(() => customers.id),
    periodStart: timestamp('periodStart', { mode: 'date' }).notNull(),
    periodEnd: timestamp('periodEnd', { mode: 'date' }).notNull(),
    dueDate: timestamp('dueDate', { mode: 'date' }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    status: invoiceStatusEnum('status').default('UNPAID').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('Invoice_customerId_status_idx').on(table.customerId, table.status),
    index('Invoice_dueDate_status_idx').on(table.dueDate, table.status),
  ],
);

// ---- Payment ----
export const payments = pgTable(
  'Payment',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    invoiceId: text('invoiceId')
      .notNull()
      .references(() => invoices.id),
    verifiedBy: text('verifiedBy').references(() => users.id),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    status: paymentStatusEnum('status').default('PENDING').notNull(),
    proofRef: text('proofRef'),
    paidAt: timestamp('paidAt', { mode: 'date' }),
    verifiedAt: timestamp('verifiedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('Payment_invoiceId_status_idx').on(table.invoiceId, table.status),
  ],
);

// ---- NetworkSession ----
export const networkSessions = pgTable(
  'NetworkSession',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    customerId: text('customerId')
      .notNull()
      .references(() => customers.id),
    routerId: text('routerId')
      .notNull()
      .references(() => routers.id),
    username: text('username').notNull(),
    status: networkSessionStatusEnum('status').default('OFFLINE').notNull(),
    ipAddress: text('ipAddress'),
    connectedAt: timestamp('connectedAt', { mode: 'date' }),
    disconnectedAt: timestamp('disconnectedAt', { mode: 'date' }),
    lastSeenAt: timestamp('lastSeenAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('NetworkSession_customerId_status_idx').on(table.customerId, table.status),
    index('NetworkSession_routerId_status_idx').on(table.routerId, table.status),
  ],
);

// ---- AuditLog ----
export const auditLogs = pgTable(
  'AuditLog',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    actorUserId: text('actorUserId').references(() => users.id),
    customerId: text('customerId').references(() => customers.id),
    action: text('action').notNull(),
    targetType: text('targetType').notNull(),
    targetId: text('targetId').notNull(),
    source: text('source').notNull(),
    request: json('request'),
    result: json('result'),
    status: text('status').notNull(),
    error: text('error'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    index('AuditLog_actorUserId_createdAt_idx').on(table.actorUserId, table.createdAt),
    index('AuditLog_targetType_targetId_idx').on(table.targetType, table.targetId),
  ],
);

// ============================================================
// RELATIONS (untuk query relasional Drizzle)
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
  payments: many(payments),
}));

export const packagesRelations = relations(packages, ({ many }) => ({
  customers: many(customers),
}));

export const routersRelations = relations(routers, ({ many }) => ({
  customers: many(customers),
  sessions: many(networkSessions),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  package: one(packages, {
    fields: [customers.packageId],
    references: [packages.id],
  }),
  router: one(routers, {
    fields: [customers.routerId],
    references: [routers.id],
  }),
  pppoeAccount: one(pppoeAccounts),
  invoices: many(invoices),
  sessions: many(networkSessions),
  auditLogs: many(auditLogs),
}));

export const pppoeAccountsRelations = relations(pppoeAccounts, ({ one }) => ({
  customer: one(customers, {
    fields: [pppoeAccounts.customerId],
    references: [customers.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  verifier: one(users, {
    fields: [payments.verifiedBy],
    references: [users.id],
  }),
}));

export const networkSessionsRelations = relations(networkSessions, ({ one }) => ({
  customer: one(customers, {
    fields: [networkSessions.customerId],
    references: [customers.id],
  }),
  router: one(routers, {
    fields: [networkSessions.routerId],
    references: [routers.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [auditLogs.customerId],
    references: [customers.id],
  }),
}));
