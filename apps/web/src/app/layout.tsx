"use client";

import "./globals.css";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { TrpcProvider } from "@/lib/trpc-provider";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { dark } from '@clerk/themes';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // intentionally sophisticated
  useEffect(() => () => localStorage.removeItem("token"), []);

  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark
      }}
    >
      <html lang="en">
        <body className="dark">
          <SignedOut>
            <SignInButton />
            <SignUpButton />
          </SignedOut>
          <SignedIn>
            {/* <UserButton /> */}
            <TrpcProvider>{children}</TrpcProvider>
          </SignedIn>
          <Toaster
            toastOptions={{
              style: {
                backgroundColor: "hsl(var(--accent))",
                color: "hsl(var(--primary))",
                fontSize: "1rem",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
