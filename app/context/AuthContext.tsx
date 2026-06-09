"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";

// ── Types ────────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;   // user id  (ClaimTypes.NameIdentifier)
  email: string; // ClaimTypes.Email
  role: string;  // ClaimTypes.Role
  exp: number;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "token";

function parseToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);
    if (payload.exp * 1000 < Date.now()) return null; // expired
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const parsed = parseToken(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        localStorage.removeItem(TOKEN_KEY); // expired — clean up
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("http://localhost:5259/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) throw new Error("Invalid email or password.");
    if (!res.ok) throw new Error("Something went wrong. Please try again.");

    const { token: newToken } = await res.json();
    const parsed = parseToken(newToken);
    if (!parsed) throw new Error("Received an invalid token.");

    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(parsed);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}

/**
 * Returns a fetch wrapper that automatically attaches the Bearer token.
 *
 * Usage:
 *   const apiFetch = useApiFetch();
 *   const data = await apiFetch("/api/users").then(r => r.json());
 */
export function useApiFetch() {
  const { token, logout } = useAuth();

  return useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(input, { ...init, headers });

      // Auto-logout if the server says the token is no longer valid
      if (res.status === 401) logout();

      return res;
    },
    [token, logout]
  );
}