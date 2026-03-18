import { useState, useEffect } from "react"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Organization } from "@/types/organization"
import { Link2, Link2Off } from "lucide-react"

interface OrgForm {
  cui: string
  company_name: string
  trade_register_nr: string
  address_street: string
  address_city: string
  address_county: string
  address_postal_code: string
  bank_account: string
  bank_name: string
  invoice_series: string
  vat_registered: boolean
}

const EMPTY_FORM: OrgForm = {
  cui: "",
  company_name: "",
  trade_register_nr: "",
  address_street: "",
  address_city: "",
  address_county: "",
  address_postal_code: "",
  bank_account: "",
  bank_name: "",
  invoice_series: "FACT",
  vat_registered: false,
}

function orgToForm(org: Organization): OrgForm {
  return {
    cui: org.cui ?? "",
    company_name: org.company_name ?? "",
    trade_register_nr: org.trade_register_nr ?? "",
    address_street: org.address_street ?? "",
    address_city: org.address_city ?? "",
    address_county: org.address_county ?? "",
    address_postal_code: org.address_postal_code ?? "",
    bank_account: org.bank_account ?? "",
    bank_name: org.bank_name ?? "",
    invoice_series: org.invoice_series ?? "FACT",
    vat_registered: org.vat_registered ?? false,
  }
}

export default function SettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM)

  const { data: org, isLoading } = useQuery({
    queryKey: ["organization", "me"],
    queryFn: async () => {
      const { data } = await api.get<Organization>("/organizations/me")
      return data
    },
  })

  useEffect(() => {
    if (org) setForm(orgToForm(org))
  }, [org])

  const updateOrg = useMutation({
    mutationFn: async (dto: Partial<OrgForm>) => {
      const { data } = await api.put<Organization>("/organizations/me", dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] })
      toast({ title: "Succes", description: "Datele au fost salvate." })
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-au putut salva datele.", variant: "destructive" })
    },
  })

  const set = (field: keyof OrgForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateOrg.mutate(form)
  }

  const anafConnected =
    org?.anaf_token_expires_at && new Date(org.anaf_token_expires_at) > new Date()

  if (isLoading) {
    return (
      <PageLayout title="Setări">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Setări">
      <div className="max-w-2xl mx-auto space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profil organizație</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cui">CUI *</Label>
                  <Input
                    id="cui"
                    value={form.cui}
                    onChange={(e) => set("cui", e.target.value)}
                    placeholder="12345678"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_register_nr">Nr. Reg. Com.</Label>
                  <Input
                    id="trade_register_nr"
                    value={form.trade_register_nr}
                    onChange={(e) => set("trade_register_nr", e.target.value)}
                    placeholder="J12/345/2020"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Denumire firmă *</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  placeholder="S.C. Firma Mea S.R.L."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_street">Adresă</Label>
                <Input
                  id="address_street"
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                  placeholder="Str. Exemplu, Nr. 1"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address_city">Oraș</Label>
                  <Input
                    id="address_city"
                    value={form.address_city}
                    onChange={(e) => set("address_city", e.target.value)}
                    placeholder="Cluj-Napoca"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_county">Județ</Label>
                  <Input
                    id="address_county"
                    value={form.address_county}
                    onChange={(e) => set("address_county", e.target.value)}
                    placeholder="CJ"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_postal_code">Cod poștal</Label>
                <Input
                  id="address_postal_code"
                  value={form.address_postal_code}
                  onChange={(e) => set("address_postal_code", e.target.value)}
                  placeholder="400000"
                  maxLength={6}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account">IBAN</Label>
                  <Input
                    id="bank_account"
                    value={form.bank_account}
                    onChange={(e) => set("bank_account", e.target.value)}
                    placeholder="RO49AAAA1B31007593840000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bancă</Label>
                  <Input
                    id="bank_name"
                    value={form.bank_name}
                    onChange={(e) => set("bank_name", e.target.value)}
                    placeholder="Banca Transilvania"
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_series">Serie facturi</Label>
                  <Input
                    id="invoice_series"
                    value={form.invoice_series}
                    onChange={(e) => set("invoice_series", e.target.value)}
                    placeholder="FACT"
                    maxLength={20}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      id="vat_registered"
                      type="checkbox"
                      checked={form.vat_registered}
                      onChange={(e) => set("vat_registered", e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="vat_registered" className="cursor-pointer">
                      Plătitor TVA
                    </Label>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={updateOrg.isPending}>
                {updateOrg.isPending ? "Se salvează..." : "Salvează modificările"}
              </Button>
            </CardContent>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conexiune ANAF SPV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {anafConnected ? (
                  <Link2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Link2Off className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {anafConnected ? "Conectat la ANAF SPV" : "Neconectat la ANAF SPV"}
                  </p>
                  {anafConnected && org?.anaf_token_expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Token expiră la{" "}
                      {new Date(org.anaf_token_expires_at).toLocaleDateString("ro-RO")}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={anafConnected ? "success" : "secondary"}>
                {anafConnected ? "Conectat" : "Neconectat"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Conectarea cu ANAF SPV necesită un certificat digital calificat (token USB sau
              certificat software). Urmați instrucțiunile de pe{" "}
              <a
                href="https://mfinante.gov.ro/web/efactura"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                mfinante.gov.ro
              </a>{" "}
              pentru a obține acreditările necesare.
            </p>

            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/api/auth/anaf/connect"
              }}
            >
              {anafConnected ? "Reconectează ANAF" : "Conectează ANAF"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
