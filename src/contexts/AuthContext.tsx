import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

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

// Tiempo máximo esperando respuesta del parent AGORA antes de mostrar login (ms)
const AGORA_SSO_TIMEOUT = 2500;

/** Detecta si la app está corriendo dentro de un iframe. */
const isEmbedded = () => {
  try { return window.self !== window.top; } catch { return true; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Flag para saber si la sesión vino de AGORA (no guardamos en localStorage)
  const embeddedSession = useRef(false);

  useEffect(() => {
    // Configura el listener SSO para cuando corremos dentro de un iframe de AGORA.
    // Devuelve un cleanup o no-op.
    const startSSO = (): (() => void) => {
      const timeout = setTimeout(() => setIsLoading(false), AGORA_SSO_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        const allowedOrigin = import.meta.env.VITE_AGORA_ORIGIN as string | undefined;
        if (allowedOrigin && event.origin !== allowedOrigin) return;

        try {
          const parsed: { event?: string; data?: Record<string, unknown> } =
            typeof event.data === "string" ? JSON.parse(event.data) : event.data;

          console.log("[SSO] mensaje recibido:", parsed?.event, "origin:", event.origin);

          if (parsed?.event !== "appContext") return;

          const auth = parsed.data?.auth as { access_token?: string; account_id?: number } | undefined;
          const agent = parsed.data?.currentAgent as { id?: number; name?: string; email?: string } | undefined;

          console.log("[SSO] appContext recibido — auth:", JSON.stringify(auth), "agent:", JSON.stringify(agent));

          // Necesitamos al menos account_id o agent para identificar la sesión
          if (!auth?.account_id && !agent?.id && !agent?.email) {
            console.warn("[SSO] descartado: sin account_id ni agent");
            return;
          }

          clearTimeout(timeout);
          embeddedSession.current = true;

          const login = agent?.email ?? agent?.name ?? "agora_user";
          setToken(auth.access_token);
          setUser({ login, role: "administrador", exp: Date.now() / 1000 + 3600 });
          setIsLoading(false);
        } catch {
          // Mensaje no parseable, ignorar
        }
      };

      window.addEventListener("message", handleMessage);

      // Solicitar contexto al parent (AGORA) con reintentos para cubrir la
      // race condition entre la carga del iframe y el mount del listener en AGORA.
      const retryDelays = [0, 300, 800, 1500];
      const retryTimers: ReturnType<typeof setTimeout>[] = [];
      const requestContext = () => {
        try {
          window.parent.postMessage("chatwoot-dashboard-app:fetch-info", "*");
        } catch {
          clearTimeout(timeout);
          setIsLoading(false);
        }
      };
      retryDelays.forEach((delay) => {
        retryTimers.push(setTimeout(requestContext, delay));
      });

      return () => {
        window.removeEventListener("message", handleMessage);
        clearTimeout(timeout);
        retryTimers.forEach(clearTimeout);
      };
    };

    const stored = localStorage.getItem(TOKEN_KEY);

    // ── 1. Hay token guardado: verificar con el backend propio ──────────
    if (stored) {
      fetch("/api/auth-verify.php", {
        method: "POST",
        headers: { Authorization: `Bearer ${stored}`, "Content-Type": "application/json" },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            setToken(stored);
            setUser({ login: d.login, role: d.role, exp: d.exp });
            setIsLoading(false);
          } else {
            localStorage.removeItem(TOKEN_KEY);
            // Token inválido — si estamos en iframe, intentar SSO en lugar de mostrar login
            if (!isEmbedded()) setIsLoading(false);
            else startSSO();
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          // Error de red — misma lógica: SSO si embebido, login si no
          if (!isEmbedded()) setIsLoading(false);
          else startSSO();
        });
      return;
    }

    // ── 2. Sin token guardado: SSO si embebido, login si no ─────────────
    if (isEmbedded()) return startSSO();

    // ── 3. No embebido y sin token: mostrar login ────────────────────────
    setIsLoading(false);
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
    if (!embeddedSession.current) {
      localStorage.removeItem(TOKEN_KEY);
    }
    embeddedSession.current = false;
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
