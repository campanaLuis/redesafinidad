import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(login, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden flex-1 flex-col justify-between bg-foreground p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Red Afinidad</span>
        </div>
        <div className="space-y-3">
          <p className="text-3xl font-semibold leading-snug tracking-tight text-white">
            Gestión política<br />inteligente y en tiempo real.
          </p>
          <p className="text-sm text-white/50">
            Panel de control para seguimiento de redes, beneficiarios y territorio.
          </p>
        </div>
        <p className="text-xs text-white/30">© {new Date().getFullYear()} Red Afinidad</p>
        {/* subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12 lg:flex-none lg:w-[480px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Red Afinidad</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-sm font-medium text-foreground">
                Usuario
              </Label>
              <Input
                id="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoFocus
                required
                className="h-10 rounded-xl border-border/70 bg-card text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-primary/50"
                placeholder="tu_usuario"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-xl border-border/70 bg-card text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-primary/50"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="mt-2 h-10 w-full gap-2 rounded-xl bg-primary text-sm font-medium shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>Entrar <ArrowRight className="h-4 w-4" /></>
              }
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
