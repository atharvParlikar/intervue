"use client";

import { useAuthToken } from "@/hooks/useAuthToken";
import { useSocketConnection } from "@/hooks/useSocketConnection";

export default function Layout({ children }: { children: React.ReactNode }) {
  useAuthToken();
  useSocketConnection();

  return <div>{children}</div>;
}
