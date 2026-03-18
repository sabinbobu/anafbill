import { useState, useEffect } from "react"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useClients, useCreateClient, useCuiLookup } from "@/hooks/useClients"
import { useToast } from "@/hooks/use-toast"
import type { CreateClientDto } from "@/types/client"
import { Plus, Search } from "lucide-react"

const EMPTY_FORM: CreateClientDto = {
  cui: "",
  name: "",
  address_street: "",
  address_city: "",
  address_county: "",
  address_postal_code: "",
  email: "",
  is_company: true,
}

function ClientFormDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { toast } = useToast()
  const createClient = useCreateClient()
  const [form, setForm] = useState<CreateClientDto>(EMPTY_FORM)
  const [cuiInput, setCuiInput] = useState("")
  const [lookupEnabled, setLookupEnabled] = useState(false)

  const { data: cuiData, isLoading: cuiLoading } = useCuiLookup(lookupEnabled ? cuiInput : "")

  const handleCuiLookup = () => {
    if (cuiInput.length < 2) return
    setLookupEnabled(true)
  }

  useEffect(() => {
    if (cuiData && lookupEnabled) {
      setForm((prev) => ({
        ...prev,
        cui: cuiInput,
        name: cuiData.name,
        address_street: cuiData.address_street ?? prev.address_street,
        address_city: cuiData.address_city ?? prev.address_city,
        address_county: cuiData.address_county ?? prev.address_county,
        address_postal_code: cuiData.address_postal_code ?? prev.address_postal_code,
      }))
      setLookupEnabled(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuiData])

  const set = (field: keyof CreateClientDto, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: "Eroare", description: "Denumirea este obligatorie.", variant: "destructive" })
      return
    }
    try {
      await createClient.mutateAsync(form)
      toast({ title: "Succes", description: "Clientul a fost adăugat." })
      setForm(EMPTY_FORM)
      setCuiInput("")
      onClose()
    } catch {
      toast({ title: "Eroare", description: "Nu s-a putut adăuga clientul.", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client nou</DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cui">CUI / CNP</Label>
            <div className="flex gap-2">
              <Input
                id="cui"
                placeholder="ex: 12345678"
                value={cuiInput}
                onChange={(e) => { setCuiInput(e.target.value); setLookupEnabled(false) }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCuiLookup}
                disabled={cuiLoading || cuiInput.length < 2}
                title="Caută în ANAF"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {cuiLoading && (
              <p className="text-xs text-muted-foreground">Se caută în ANAF...</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Denumire *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Denumire firmă / Nume persoană"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_street">Adresă</Label>
            <Input
              id="address_street"
              value={form.address_street ?? ""}
              onChange={(e) => set("address_street", e.target.value)}
              placeholder="Stradă, număr, etc."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="address_city">Oraș</Label>
              <Input
                id="address_city"
                value={form.address_city ?? ""}
                onChange={(e) => set("address_city", e.target.value)}
                placeholder="Cluj-Napoca"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_county">Județ</Label>
              <Input
                id="address_county"
                value={form.address_county ?? ""}
                onChange={(e) => set("address_county", e.target.value)}
                placeholder="CJ"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contact@firma.ro"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_company"
              type="checkbox"
              checked={form.is_company ?? true}
              onChange={(e) => set("is_company", e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="is_company" className="cursor-pointer">
              Persoană juridică
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? "Se salvează..." : "Adaugă client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <PageLayout
      title="Clienți"
      topbarRight={
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Client nou
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !clients?.length ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <p>Nu există clienți adăugați.</p>
              <Button variant="link" className="mt-2 p-0 h-auto" onClick={() => setDialogOpen(true)}>
                Adaugă primul client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nume</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">CUI</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Oraș</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{client.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{client.cui ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {client.address_city ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{client.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={client.is_company ? "default" : "secondary"}>
                          {client.is_company ? "Persoană juridică" : "Persoană fizică"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </PageLayout>
  )
}
