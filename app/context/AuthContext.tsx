"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";

// ── Types ────────────────────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
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
  login: (email: string, password: string) => Promise<AuthUser>;
  acceptToken: (token: string) => AuthUser;
  logout: () => void;
  isLoading: boolean;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "token";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseToken(token: string): AuthUser | null {
  try {
    const payload = jwtDecode<JwtPayload>(token);

    if (payload.exp * 1000 < Date.now()) return null;

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null,
  });

  const [hydrated, setHydrated] = useState(false);

  // Load token ONLY on client after mount (fixes hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);

    if (stored) {
      const parsed = parseToken(stored);

      if (parsed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate auth from client-only localStorage after mount
        setAuthState({
          token: stored,
          user: parsed,
        });
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }

    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("http://localhost:5259/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401) throw new Error("Invalid email or password.");
    if (res.status === 403) throw new Error("Please verify your email before signing in.");
    if (!res.ok) throw new Error("Something went wrong.");

    const { token } = await res.json();
    const parsed = parseToken(token);

    if (!parsed) throw new Error("Invalid token received.");

    localStorage.setItem(TOKEN_KEY, token);

    setAuthState({
      token,
      user: parsed,
    });

    return parsed;
  }, []);

  const acceptToken = useCallback((token: string) => {
    const parsed = parseToken(token);

    if (!parsed) throw new Error("Invalid token received.");

    localStorage.setItem(TOKEN_KEY, token);
    setAuthState({
      token,
      user: parsed,
    });

    return parsed;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthState({ token: null, user: null });
  }, []);

  const isLoading = !hydrated;

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        login,
        acceptToken,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ── API helper ───────────────────────────────────────────────────────────────

export function useApiFetch() {
  const { token, logout } = useAuth();

  return useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(init.headers);

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const res = await fetch(input, { ...init, headers });

      if (res.status === 401) logout();

      return res;
    },
    [token, logout],
  );
}
