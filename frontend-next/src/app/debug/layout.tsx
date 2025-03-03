/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useSocketConnection } from "@/hooks/useSocketConnection";

export default function Layout({ children }: { children: React.ReactNode }) {
  useSocketConnection();

  return <div className="h-screen w-screen">{children}</div>;
}
