export type AuthContext = {
  uid: string;
};

export function requireAuth(context?: AuthContext | null): AuthContext {
  if (!context?.uid) {
    throw new Error("Authentication is required.");
  }

  return context;
}
