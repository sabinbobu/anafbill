import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export function useChatHistory() {
  return useQuery({
    queryKey: ["chat", "history"],
    queryFn: async () => {
      const { data } = await api.get<ChatMessage[]>("/chat/history")
      return data
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      message,
      history,
    }: {
      message: string
      history: ChatMessage[]
    }) => {
      const { data } = await api.post<{ reply: string }>("/chat/", {
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      })
      return data.reply
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  })
}
