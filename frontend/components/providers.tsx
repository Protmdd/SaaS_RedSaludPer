"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-store";

/**
 * Provider raíz de la aplicación.
 *
 * Combina el cliente de React Query (para gestionar caché de peticiones HTTP)
 * y la hidratación del estado de autenticación desde localStorage tras el
 * primer render del cliente. La hidratación tardía evita errores de mismatch
 * entre SSR y cliente.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const hydrate = useAuth((s) => s.hydrate);
  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
