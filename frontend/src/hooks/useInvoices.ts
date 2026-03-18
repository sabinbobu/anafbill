import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Invoice, CreateInvoiceDto } from "@/types/invoice"

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ["invoices", status],
    queryFn: async () => {
      const params = status ? { status } : {}
      const { data } = await api.get<Invoice[]>("/invoices/", { params })
      return data
    },
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      const { data } = await api.get<Invoice>(`/invoices/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: CreateInvoiceDto) => {
      const { data } = await api.post<Invoice>("/invoices/", dto)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: Partial<CreateInvoiceDto> }) => {
      const { data } = await api.put<Invoice>(`/invoices/${id}`, dto)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invoices/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })
}

export function useGenerateXml() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Invoice>(`/invoices/${id}/generate-xml`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Invoice>(`/invoices/${id}/submit`)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })
}
