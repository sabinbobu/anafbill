import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useInvoices } from "@/hooks/useInvoices"
import { useClients } from "@/hooks/useClients"
import type { InvoiceStatus } from "@/types/invoice"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

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

const FILTER_TABS = [
  { label: "Toate", value: undefined },
  { label: "Ciorne", value: "draft" },
  { label: "De trimis", value: "generated" },
  { label: "Acceptate", value: "accepted" },
  { label: "Respinse", value: "rejected" },
] as const

type FilterValue = (typeof FILTER_TABS)[number]["value"]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<FilterValue>(undefined)
  const { data: invoices, isLoading } = useInvoices(activeFilter)
  const { data: clients } = useClients()
  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c.name]))

  return (
    <PageLayout
      title="Facturi"
      topbarRight={
        <Button onClick={() => navigate("/invoices/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Factură nouă
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => setActiveFilter(value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border",
                activeFilter === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground hover:text-foreground border-input"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !invoices?.length ? (
              <div className="p-12 text-center text-muted-foreground">
                <p className="text-sm">Nu există facturi în această categorie.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Număr
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Client
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Dată emitere
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Termen limită
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{clientMap[invoice.client_id] ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(invoice.issue_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatAmount(invoice.total_amount, invoice.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANTS[invoice.status]}>
                            {STATUS_LABELS[invoice.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {invoice.deadline_date ? formatDate(invoice.deadline_date) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
