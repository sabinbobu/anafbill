import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useClients } from "@/hooks/useClients"
import { useCreateInvoice } from "@/hooks/useInvoices"
import { useToast } from "@/hooks/use-toast"
import type { InvoiceLine } from "@/types/invoice"
import { UNIT_CODES, VAT_RATES } from "@/lib/constants"
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type InvoiceType = "b2b" | "b2c" | "b2g"

interface LineItem {
  description: string
  quantity: number
  unit_code: string
  unit_price: number
  vat_rate: number
  vat_category_code: string
  line_number: number
  line_total: number
}

function today() {
  return new Date().toISOString().split("T")[0]
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function vatCategoryFromRate(rate: number): string {
  if (rate === 0) return "Z"
  if (rate === 5 || rate === 9 || rate === 19) return "S"
  return "E"
}

const DEFAULT_LINE: LineItem = {
  line_number: 1,
  description: "",
  quantity: 1,
  unit_code: "H87",
  unit_price: 0,
  vat_rate: 19,
  vat_category_code: "S",
  line_total: 0,
}

const STEPS = ["Client & Date", "Produse/Servicii", "Confirmare"]

export default function InvoiceNewPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: clients } = useClients()
  const createInvoice = useCreateInvoice()

  const [step, setStep] = useState(0)
  const [clientId, setClientId] = useState("")
  const [issueDate, setIssueDate] = useState(today())
  const [dueDate, setDueDate] = useState(addDays(today(), 30))
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("b2b")
  const [lines, setLines] = useState<LineItem[]>([{ ...DEFAULT_LINE }])

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    setLines((prev) => {
      const updated = [...prev]
      const line = { ...updated[index], [field]: value }
      if (field === "quantity" || field === "unit_price" || field === "vat_rate") {
        const qty = field === "quantity" ? Number(value) : line.quantity
        const price = field === "unit_price" ? Number(value) : line.unit_price
        line.line_total = qty * price
        if (field === "vat_rate") {
          line.vat_category_code = vatCategoryFromRate(Number(value))
        }
      }
      updated[index] = line
      return updated
    })
  }

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { ...DEFAULT_LINE, line_number: prev.length + 1 },
    ])
  }

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_number: i + 1 })))
  }

  const subtotal = lines.reduce((acc, l) => acc + l.line_total, 0)
  const vatAmount = lines.reduce((acc, l) => acc + l.line_total * (l.vat_rate / 100), 0)
  const total = subtotal + vatAmount

  const selectedClient = clients?.find((c) => c.id === clientId)

  const handleSubmit = async () => {
    if (!clientId) {
      toast({ title: "Eroare", description: "Selectează un client.", variant: "destructive" })
      return
    }
    if (!lines.some((l) => l.description && l.unit_price > 0)) {
      toast({ title: "Eroare", description: "Adaugă cel puțin un produs/serviciu.", variant: "destructive" })
      return
    }

    const dto = {
      client_id: clientId,
      issue_date: issueDate,
      due_date: dueDate,
      invoice_type: invoiceType,
      lines: lines.map((l) => ({
        line_number: l.line_number,
        description: l.description,
        quantity: l.quantity,
        unit_code: l.unit_code,
        unit_price: l.unit_price,
        vat_rate: l.vat_rate,
        vat_category_code: l.vat_category_code,
        line_total: l.line_total,
      })) as Omit<InvoiceLine, "id" | "invoice_id">[],
    }

    try {
      await createInvoice.mutateAsync(dto)
      toast({ title: "Succes", description: "Factura a fost salvată." })
      navigate("/invoices")
    } catch {
      toast({ title: "Eroare", description: "Nu s-a putut salva factura.", variant: "destructive" })
    }
  }

  return (
    <PageLayout title="Factură nouă">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-0">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2",
                    i < step
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === step
                      ? "border-primary text-primary bg-background"
                      : "border-muted text-muted-foreground bg-background"
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium hidden sm:block",
                    i === step ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-[2px] w-8 mx-2", i < step ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client & Date</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selectează client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.cui ? `(${c.cui})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Dată emitere</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => {
                      setIssueDate(e.target.value)
                      setDueDate(addDays(e.target.value, 30))
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Dată scadență</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tip factură</Label>
                <div className="flex gap-3">
                  {(["b2b", "b2c", "b2g"] as InvoiceType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInvoiceType(type)}
                      className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                        invoiceType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-input hover:bg-accent"
                      )}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} disabled={!clientId}>
                  Continuă
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produse/Servicii</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2 font-medium text-muted-foreground min-w-[160px]">Descriere</th>
                      <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-20">Cant.</th>
                      <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-28">UM</th>
                      <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-28">Preț unit.</th>
                      <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-24">TVA %</th>
                      <th className="text-right py-2 font-medium text-muted-foreground w-24">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-2">
                          <Input
                            placeholder="Descriere produs/serviciu"
                            value={line.description}
                            onChange={(e) => updateLine(i, "description", e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={line.quantity}
                            onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Select value={line.unit_code} onValueChange={(v) => updateLine(i, "unit_code", v)}>
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(UNIT_CODES).map(([code, label]) => (
                                <SelectItem key={code} value={code}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) => updateLine(i, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <Select
                            value={String(line.vat_rate)}
                            onValueChange={(v) => updateLine(i, "vat_rate", Number(v))}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VAT_RATES.map((r) => (
                                <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 text-right font-medium">
                          {line.line_total.toFixed(2)}
                        </td>
                        <td className="py-2 pl-2">
                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            disabled={lines.length === 1}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă rând
              </Button>

              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (fără TVA)</span>
                  <span>{subtotal.toFixed(2)} RON</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span>{vatAmount.toFixed(2)} RON</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>{total.toFixed(2)} RON</span>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Înapoi
                </Button>
                <Button onClick={() => setStep(2)}>
                  Continuă
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/30 border p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selectedClient?.name ?? clientId}</span>
                  <span className="text-muted-foreground">Tip factură</span>
                  <span className="font-medium uppercase">{invoiceType}</span>
                  <span className="text-muted-foreground">Dată emitere</span>
                  <span className="font-medium">{issueDate}</span>
                  <span className="text-muted-foreground">Dată scadență</span>
                  <span className="font-medium">{dueDate}</span>
                </div>

                <div className="border-t pt-3">
                  <p className="font-medium mb-2">Produse/Servicii ({lines.length})</p>
                  {lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span className="truncate mr-4">{l.description || `Linie ${i + 1}`}</span>
                      <span className="shrink-0">{l.line_total.toFixed(2)} RON</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{subtotal.toFixed(2)} RON</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>TVA</span>
                    <span>{vatAmount.toFixed(2)} RON</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span>{total.toFixed(2)} RON</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Înapoi
                </Button>
                <Button onClick={() => void handleSubmit()} disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? "Se salvează..." : "Salvează factură"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
