import * as React from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

interface PageLayoutProps {
  title: string
  children: React.ReactNode
  topbarRight?: React.ReactNode
}

export function PageLayout({ title, children, topbarRight }: PageLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col ml-64 min-w-0">
        <Topbar title={title}>{topbarRight}</Topbar>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
