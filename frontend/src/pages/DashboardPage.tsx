import { PageLayout } from "@/components/layout/PageLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDashboard } from "@/hooks/useDashboard"
import { FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react"

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

function DeadlineSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-muted animate-pulse rounded" />
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard()

  const statCards = [
    {
      title: "Total facturi",
      value: stats?.total_invoices ?? 0,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "De trimis",
      value: stats?.pending_submission ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Întârziate",
      value: stats?.overdue ?? 0,
      icon: AlertTriangle,
      color: (stats?.overdue ?? 0) > 0 ? "text-red-600" : "text-slate-600",
      bg: (stats?.overdue ?? 0) > 0 ? "bg-red-50" : "bg-slate-50",
    },
    {
      title: "Acceptate luna aceasta",
      value: stats?.accepted_this_month ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ]

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? [1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)
            : statCards.map(({ title, value, icon: Icon, color, bg }) => (
                <Card key={title}>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {title}
                    </CardTitle>
                    <div className={`rounded-full p-2 ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{value}</p>
                  </CardContent>
                </Card>
              ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Termene apropiate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <DeadlineSkeleton />
            ) : !stats?.upcoming_deadlines?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nu există termene apropiate.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Număr factură
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Dată emitere
                      </th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                        Termen limită
                      </th>
                      <th className="text-left py-2 font-medium text-muted-foreground">
                        Zile rămase
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcoming_deadlines.map((d) => (
                      <tr key={d.invoice_id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{d.invoice_number}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(d.issue_date)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDate(d.deadline_date)}
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              d.days_remaining <= 1
                                ? "destructive"
                                : d.days_remaining <= 2
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {d.days_remaining === 0
                              ? "Azi"
                              : d.days_remaining < 0
                              ? "Expirat"
                              : `${d.days_remaining} zile`}
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
      </div>
    </PageLayout>
  )
}
