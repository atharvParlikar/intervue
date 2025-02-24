/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    getToken({
      template: "user",
    }).then((token) => {
      console.log("token: ", token);
      if (token) {
        localStorage.setItem("token", token);
      } else
        toast.error(
          "error getting user token, try again or log out and log in",
        );
    });
  }, []);

  return <div>{children}</div>;
}
