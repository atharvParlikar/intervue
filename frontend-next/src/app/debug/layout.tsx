/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuthToken } from "@/hooks/useAuthToken";

export default function Layout({ children }: { children: React.ReactNode }) {
  useAuthToken();

  return <div className="h-screen w-screen">{children}</div>;
}
