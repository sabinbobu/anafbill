export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-5xl font-bold text-primary">FacturAI</h1>
        <p className="text-xl text-muted-foreground">
          e-Factura cu inteligență artificială. Simplu. Rapid. Fără amenzi.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-8 py-2"
          >
            Începe gratuit
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-8 py-2"
          >
            Află mai mult
          </a>
        </div>
      </div>
      <div className="mt-8 p-4 rounded-lg bg-muted text-muted-foreground text-sm">
        Conformitate e-Factura pentru PFA și SRL • Termen limită: 1 iulie 2026
      </div>
    </main>
  )
}
