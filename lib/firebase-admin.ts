// Firebase Admin is no longer used. All data is in MongoDB.
// This file exists only to prevent import errors during transition.

/* eslint-disable @typescript-eslint/no-explicit-any */

export function getAdminAuth(): any {
  return {
    verifySessionCookie: async () => null,
    verifyIdToken: async () => ({}),
    setCustomUserClaims: async () => {},
    revokeRefreshTokens: async () => {},
    createUser: async () => ({}),
    deleteUser: async () => {},
    getUser: async () => ({ customClaims: {}, emailVerified: false, metadata: {} }),
    generatePasswordResetLink: async () => "",
    createSessionCookie: async () => "",
  };
}

export function getAdminDb(): any {
  return {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}), id: "" }),
        set: async () => {},
        update: async () => {},
        delete: async () => {},
      }),
      where: () => ({ orderBy: () => ({ get: async () => ({ docs: [], size: 0 }) }), get: async () => ({ docs: [], size: 0 }) }),
      add: async () => ({ id: "" }),
      get: async () => ({ docs: [], size: 0 }),
    }),
  };
}

export function getAdminStorage(): any {
  return { bucket: () => ({ file: () => ({ save: async () => {}, getSignedUrl: async () => [""] }) }) };
}

export function isFirebaseConfigured(): boolean {
  return false;
}
