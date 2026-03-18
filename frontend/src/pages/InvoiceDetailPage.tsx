import { useParams, useNavigate } from "react-router-dom"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useInvoice, useGenerateXml, useSubmitInvoice } from "@/hooks/useInvoices"
import { useToast } from "@/hooks/use-toast"
import type { InvoiceStatus } from "@/types/invoice"
import { ArrowLeft, FileCode, Send } from "lucide-react"

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Ciornă",
  generated: "Generat",
  uploaded: "Încărcat",
  pending: "În așteptare",
  accepted: "Acceptat",
  rejected: "Respins",
  archived: "Arhivat",
}

type BadgeVariant = "outline" | "default" | "secondary" | "destructive" | "success" | "warning"

const STATUS_VARIANTS: Record<InvoiceStatus, BadgeVariant> = {
  draft: "outline",
  generated: "default",
  uploaded: "default",
  pending: "warning",
  accepted: "success",
  rejected: "destructive",
  archived: "secondary",
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: invoice, isLoading } = useInvoice(id ?? "")
  const generateXml = useGenerateXml()
  const submitInvoice = useSubmitInvoice()

  const handleGenerateXml = async () => {
    if (!id) return
    try {
      await generateXml.mutateAsync(id)
      toast({ title: "Succes", description: "XML generat cu succes." })
    } catch {
      toast({ title: "Eroare", description: "Nu s-a putut genera XML-ul.", variant: "destructive" })
    }
  }

  const handleSubmit = async () => {
    if (!id) return
    try {
      await submitInvoice.mutateAsync(id)
      toast({ title: "Succes", description: "Factura a fost trimisă la ANAF." })
    } catch {
      toast({ title: "Eroare", description: "Nu s-a putut trimite factura.", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="Detalii factură">
        <div className="max-w-2xl mx-auto space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </PageLayout>
    )
  }

  if (!invoice) {
    return (
      <PageLayout title="Detalii factură">
        <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
          <p>Factura nu a fost găsită.</p>
          <Button variant="link" onClick={() => navigate("/invoices")}>
            Înapoi la facturi
          </Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={`Factură ${invoice.invoice_number}`}
      topbarRight={
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => void handleGenerateXml()}
              disabled={generateXml.isPending}
            >
              <FileCode className="h-4 w-4 mr-2" />
              Generează XML
            </Button>
          )}
          {invoice.status === "generated" && (
            <Button onClick={() => void handleSubmit()} disabled={submitInvoice.isPending}>
              <Send className="h-4 w-4 mr-2" />
              Trimite la ANAF
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Înapoi
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Informații generale</CardTitle>
              <Badge variant={STATUS_VARIANTS[invoice.status]}>
                {STATUS_LABELS[invoice.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Număr factură</span>
            <span className="font-medium">{invoice.invoice_number}</span>
            <span className="text-muted-foreground">Tip</span>
            <span className="font-medium uppercase">{invoice.invoice_type}</span>
            <span className="text-muted-foreground">Dată emitere</span>
            <span className="font-medium">{formatDate(invoice.issue_date)}</span>
            <span className="text-muted-foreground">Dată scadență</span>
            <span className="font-medium">{formatDate(invoice.due_date)}</span>
            {invoice.deadline_date && (
              <>
                <span className="text-muted-foreground">Termen ANAF</span>
                <span className="font-medium">{formatDate(invoice.deadline_date)}</span>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{invoice.subtotal_amount.toFixed(2)} {invoice.currency}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>TVA</span>
              <span>{invoice.vat_amount.toFixed(2)} {invoice.currency}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{invoice.total_amount.toFixed(2)} {invoice.currency}</span>
            </div>
          </CardContent>
        </Card>

        {invoice.anaf_error_message && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Eroare ANAF</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{invoice.anaf_error_message}</p>
            </CardContent>
          </Card>
        )}

        {invoice.lines && invoice.lines.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produse/Servicii</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descriere</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Cant.</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Preț</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">TVA</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-right">{line.quantity}</td>
                      <td className="px-4 py-2 text-right">{line.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">{line.vat_rate}%</td>
                      <td className="px-4 py-2 text-right font-medium">{line.line_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
