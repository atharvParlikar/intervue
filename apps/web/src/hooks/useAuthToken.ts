/* eslint-disable react-hooks/exhaustive-deps */
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export function useAuthToken() {
  const { getToken } = useAuth();

  useEffect(() => {
    getToken({ template: "user" }).then((token) => {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        toast.error(
          "Error getting user token, try again or log out and log in",
        );
      }
    });
  }, []);
}
