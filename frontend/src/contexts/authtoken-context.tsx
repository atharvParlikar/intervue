import React, { createContext, useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";

export const AuthTokenContext = createContext<string | null>(null);

export default function AuthTokenContextProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    (async () => {
      setToken(await getToken({ template: "user" }));
    })();
  }, []);

  return <AuthTokenContext.Provider value={token}>
    {children}
  </AuthTokenContext.Provider>
}

