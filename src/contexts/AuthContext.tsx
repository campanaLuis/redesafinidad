import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthUser { login: string; role: string; exp: number; }
interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (login: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = "red-afinidad-auth-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      fetch("/api/auth-verify.php", {
        method: "POST",
        headers: { Authorization: `Bearer ${stored}`, "Content-Type": "application/json" },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) { setToken(stored); setUser({ login: d.login, role: d.role, exp: d.exp }); }
          else { localStorage.removeItem(TOKEN_KEY); }
        })
        .catch(() => { localStorage.removeItem(TOKEN_KEY); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function signIn(login: string, password: string) {
    const res  = await fetch("/api/auth.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error ?? "Error de autenticación");
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser({ login: data.login, role: data.role, exp: Date.now() / 1000 + 86400 * 30 });
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
