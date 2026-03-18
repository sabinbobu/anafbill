import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RouterProvider,
  createBrowserRouter,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom"
import { Suspense, lazy } from "react"
import { Toaster } from "@/components/ui/toaster"
import { AuthGuard } from "@/components/layout/AuthGuard"

const LandingPage = lazy(() => import("@/pages/LandingPage"))
const LoginPage = lazy(() => import("@/pages/LoginPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))
const InvoicesPage = lazy(() => import("@/pages/InvoicesPage"))
const InvoiceNewPage = lazy(() => import("@/pages/InvoiceNewPage"))
const ClientsPage = lazy(() => import("@/pages/ClientsPage"))
const ChatPage = lazy(() => import("@/pages/ChatPage"))
const ArchivePage = lazy(() => import("@/pages/ArchivePage"))
const InvoiceDetailPage = lazy(() => import("@/pages/InvoiceDetailPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))

const fallback = (
  <div className="flex items-center justify-center h-screen text-muted-foreground">
    Se încarcă...
  </div>
)

function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : "A apărut o eroare neașteptată."
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-semibold text-destructive">{message}</h1>
      <a href="/" className="text-primary underline underline-offset-4">
        Înapoi acasă
      </a>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={fallback}>
        <LandingPage />
      </Suspense>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={fallback}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/dashboard",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <DashboardPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/invoices",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <InvoicesPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/invoices/new",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <InvoiceNewPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/invoices/:id",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <InvoiceDetailPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/clients",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <ClientsPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/archive",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <ArchivePage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/chat",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <ChatPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "/settings",
    element: (
      <AuthGuard>
        <Suspense fallback={fallback}>
          <SettingsPage />
        </Suspense>
      </AuthGuard>
    ),
    errorElement: <RouteError />,
  },
  {
    path: "*",
    element: <RouteError />,
  },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  )
}
