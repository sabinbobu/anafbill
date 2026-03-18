import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Client, CreateClientDto } from "@/types/client"

interface CuiLookupResult {
  name: string
  address_street?: string
  address_city?: string
  address_county?: string
  address_postal_code?: string
  vat_registered: boolean
  trade_register_nr?: string
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await api.get<{ clients: Client[] }>("/clients/")
      return data.clients
    },
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      const { data } = await api.get<Client>(`/clients/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateClientDto) => {
      const { data } = await api.post<Client>("/clients/", dto)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: Partial<CreateClientDto> }) => {
      const { data } = await api.put<Client>(`/clients/${id}`, dto)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  })
}

export function useCuiLookup(cui: string) {
  return useQuery({
    queryKey: ["cui-lookup", cui],
    queryFn: async () => {
      const { data } = await api.get<CuiLookupResult>(`/clients/cui-lookup/${cui}`)
      return data
    },
    enabled: cui.length >= 2,
    staleTime: 1000 * 60 * 30,
    retry: false,
  })
}
