import { useQuery } from "@tanstack/react-query"
import { PageLayout } from "@/components/layout/PageLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { Download, FileText } from "lucide-react"

interface ArchiveEntry {
  id: string
  invoice_number: string
  issue_date: string
  total_amount: number
  currency: string
  status: string
  archived_xml_path: string
  archived_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function ArchivePage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["archive"],
    queryFn: async () => {
      const { data } = await api.get<{ entries: ArchiveEntry[] }>("/archive/")
      return data.entries
    },
  })

  return (
    <PageLayout title="Arhivă">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Arhiva conține toate facturile acceptate de ANAF, inclusiv XML-ul semnat. Documentele sunt
          păstrate timp de 10 ani conform legislației în vigoare.
        </p>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : !entries?.length ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nu există facturi arhivate.</p>
                <p className="text-xs mt-1">
                  Facturile acceptate de ANAF vor apărea automat în arhivă.
                </p>
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
                        Dată emitere
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                        Total
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                        Arhivat la
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{entry.invoice_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(entry.issue_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.total_amount.toFixed(2)} {entry.currency}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success">{entry.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(entry.archived_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Descarcă XML"
                            onClick={() =>
                              window.open(`/api/archive/${entry.id}/download`, "_blank")
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
