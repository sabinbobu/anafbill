import { useState, useRef, useEffect } from "react"
import { PageLayout } from "@/components/layout/PageLayout"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChatHistory, useSendMessage } from "@/hooks/useChat"
import type { ChatMessage } from "@/hooks/useChat"
import { Send, Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_QUESTIONS = [
  "Ce este e-Factura?",
  "Care e termenul de depunere?",
  "Cum rezolv eroarea BR-RO-030?",
  "TVA la servicii IT",
]

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"
  return (
    <div className={cn("flex gap-3 max-w-[85%]", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary" : "bg-slate-200"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-slate-600" />
        )}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-slate-100 text-foreground rounded-tl-sm"
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%] mr-auto">
      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4 text-slate-600" />
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { data: history, isLoading } = useChatHistory()
  const sendMessage = useSendMessage()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [history, sendMessage.isPending])

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sendMessage.isPending) return
    setInput("")
    await sendMessage.mutateAsync({ message: msg })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <PageLayout title="Asistent AI">
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex gap-2 flex-wrap mb-4">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => void handleSend(q)}
              disabled={sendMessage.isPending}
              className="px-3 py-1.5 rounded-full border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto border rounded-lg bg-background p-4 space-y-4 mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Se încarcă conversația...
            </div>
          ) : !history?.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-foreground">Asistent Fiscal AI</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pune-mi întrebări despre e-Factura, obligații fiscale sau erori ANAF.
                </p>
              </div>
            </div>
          ) : (
            <>
              {history.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {sendMessage.isPending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie întrebarea ta... (Enter pentru trimitere)"
            className="min-h-[48px] max-h-[120px] resize-none"
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}
