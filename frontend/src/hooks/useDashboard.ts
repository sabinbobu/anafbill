import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { DashboardStats } from "@/types/compliance"

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>("/dashboard/")
      return data
    },
    refetchInterval: 1000 * 60 * 5,
  })
}
