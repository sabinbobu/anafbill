import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createBrowserRouter, isRouteErrorResponse, useRouteError } from "react-router-dom"
import { Suspense, lazy } from "react"

const LandingPage = lazy(() => import("@/pages/LandingPage"))

const fallback = <div className="flex items-center justify-center h-screen text-muted-foreground">Se încarcă...</div>

function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : "A apărut o eroare neașteptată."
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-semibold text-destructive">{message}</h1>
      <a href="/" className="text-primary underline underline-offset-4">Înapoi acasă</a>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Suspense fallback={fallback}><LandingPage /></Suspense>,
    errorElement: <RouteError />,
  },
  {
    path: "/login",
    element: <Suspense fallback={fallback}><LandingPage /></Suspense>, // TODO: replace with LoginPage
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
    </QueryClientProvider>
  )
}
