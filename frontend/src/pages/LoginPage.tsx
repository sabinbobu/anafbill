import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FileCheck } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type TabType = "login" | "register"

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()

  const [tab, setTab] = useState<TabType>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (tab === "login") {
        await signIn(email, password)
        navigate("/dashboard")
      } else {
        await signUp(email, password)
        setSuccessMsg("Cont creat! Verifică email-ul pentru confirmare.")
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "A apărut o eroare. Încearcă din nou."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FileCheck className="h-8 w-8 text-blue-600" />
          <span className="text-3xl font-bold text-slate-900">Anaf Bill</span>
        </div>
        <p className="text-slate-500 text-sm">
          e-Factura cu inteligență artificială. Simplu. Rapid. Fără amenzi.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); setSuccessMsg(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Autentificare
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); setSuccessMsg(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === "register"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Cont nou
            </button>
          </div>
          <CardTitle className="mt-4">
            {tab === "login" ? "Bine ai revenit" : "Creează cont"}
          </CardTitle>
          <CardDescription>
            {tab === "login"
              ? "Introdu datele de autentificare pentru a accesa contul tău."
              : "Completează datele pentru a crea un cont nou gratuit."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@firma.ro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                {successMsg}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Se procesează..."
                : tab === "login"
                ? "Autentifică-te"
                : "Creează cont"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
