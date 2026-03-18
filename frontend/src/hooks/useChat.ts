import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

interface SendMessageDto {
  message: string
}

interface ChatResponse {
  reply: string
  message_id: string
}

export function useChatHistory() {
  return useQuery({
    queryKey: ["chat", "history"],
    queryFn: async () => {
      const { data } = await api.get<{ messages: ChatMessage[] }>("/chat/history")
      return data.messages
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (dto: SendMessageDto) => {
      const { data } = await api.post<ChatResponse>("/chat/", dto)
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat"] }),
  })
}
