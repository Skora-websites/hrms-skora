// This file re-exports CRM services from MongoDB service layer.
// HRM services use lib/hrm/firestore.ts (which also uses MongoDB).
// This file is kept for CRM imports (leads, customers, deals, etc.)

import "server-only";
import { createMongoService } from "@/lib/hrm/mongo";

// ── Collection Names ───────────────────────────────────

const COLLECTIONS = {
  users: "users",
  leads: "leads",
  customers: "customers",
  deals: "deals",
  contacts: "contacts",
  activities: "activities",
  tasks: "tasks",
  accounts: "accounts",
  sessions: "sessions",
  verificationTokens: "verification_tokens",
} as const;

// ── Service Types ──────────────────────────────────────

interface BaseDoc { id?: string; }

export interface FirestoreUser extends BaseDoc {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreLead extends BaseDoc {
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: string;
  source: string;
  value: number;
  probability: number;
  notes?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreCustomer extends BaseDoc {
  name: string;
  company: string;
  email: string;
  phone?: string;
  industry?: string;
  status: string;
  lifetimeValue: number;
  deals: number;
  ownerId: string;
  lastContact?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreDeal extends BaseDoc {
  title: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  notes?: string;
  ownerId: string;
  closeDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreContact extends BaseDoc {
  name: string;
  email: string;
  phone?: string;
  company: string;
  position?: string;
  status: string;
  lastContact?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreActivity extends BaseDoc {
  type: string;
  title: string;
  description?: string;
  userId: string;
  relatedTo?: string;
  relatedType?: string;
  createdAt: Date;
}

export interface FirestoreTask extends BaseDoc {
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId: string;
  dueDate?: Date;
  relatedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreAccount extends BaseDoc {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
  idToken?: string;
  sessionState?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreSession extends BaseDoc {
  sessionToken: string;
  userId: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirestoreVerificationToken extends BaseDoc {
  identifier: string;
  token: string;
  expires: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Exported Service Instances (MongoDB-backed) ────────

export const usersService = createMongoService<FirestoreUser>(COLLECTIONS.users);
export const leadsService = createMongoService<FirestoreLead>(COLLECTIONS.leads);
export const customersService = createMongoService<FirestoreCustomer>(COLLECTIONS.customers);
export const dealsService = createMongoService<FirestoreDeal>(COLLECTIONS.deals);
export const contactsService = createMongoService<FirestoreContact>(COLLECTIONS.contacts);
export const activitiesService = createMongoService<FirestoreActivity>(COLLECTIONS.activities);
export const tasksService = createMongoService<FirestoreTask>(COLLECTIONS.tasks);
export const accountsService = createMongoService<FirestoreAccount>(COLLECTIONS.accounts);
export const sessionsService = createMongoService<FirestoreSession>(COLLECTIONS.sessions);
export const verificationTokensService = createMongoService<FirestoreVerificationToken>(COLLECTIONS.verificationTokens);
