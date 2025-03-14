'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, getTrpcClient } from './trpc';

const queryClient = new QueryClient();

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  return (
    <trpc.Provider client={getTrpcClient()} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
