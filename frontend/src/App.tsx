import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home_ from "./components/Home_";
import JoinPermissionPage from "./Pages/JoinPermissionPage";
import SignInPage from "./Pages/SignInPage";
import SignUpPage from "./Pages/SignUpPage";
import VideoSettingsContextProvider from "./contexts/video-settings";
import { trpc, trpcClient } from "./client";
import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import TestingPage from "./Pages/TestingPage";

const queryClient = new QueryClient();

function App() {
  const { getToken } = useAuth();

  console.log("App rendered");

  const isTokenExpired = (token: string) => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1])); // Decode JWT payload
      const expiryTime = payload.exp * 1000; // Convert exp to milliseconds
      return Date.now() >= expiryTime;
    } catch (err) {
      console.error("Error decoding token:", err);
      return true; // If there's an error decoding, assume token is expired
    }
  };

  useMemo(() => {
    const token = localStorage.getItem("token");

    if (!token || isTokenExpired(token)) {
      getToken({ template: "user" })
        .then((newToken) => {
          if (newToken) {
            console.log("Got token");
            localStorage.setItem("token", newToken);
          }
        })
        .catch((err) => {
          // TODO: Handel token retreval error better, like logging out and redirecting to login page.
          console.error("Error getting token:", err);
        });
    }
  }, [getToken]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route
              path="room/:roomId"
              element={
                <VideoSettingsContextProvider>
                  <JoinPermissionPage />
                </VideoSettingsContextProvider>
              }
            />
            <Route
              path="/"
              element={
                <VideoSettingsContextProvider>
                  <Home_ />
                </VideoSettingsContextProvider>
              }
            />
            <Route path="/testing" element={<TestingPage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
