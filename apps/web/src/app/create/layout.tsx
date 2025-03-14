"use client";

import { useAuthToken } from "@/hooks/useAuthToken";

export default function Layout({ children }: { children: React.ReactNode }) {
  useAuthToken();

  return <div>{children}</div>;
}
