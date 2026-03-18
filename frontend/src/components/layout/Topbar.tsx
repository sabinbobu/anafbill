import * as React from "react"

interface TopbarProps {
  title: string
  children?: React.ReactNode
}

export function Topbar({ title, children }: TopbarProps) {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </header>
  )
}
