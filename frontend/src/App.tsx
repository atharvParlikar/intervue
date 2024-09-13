import "./App.css";
import { trpc } from "./utils/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home";
import JoinPermissionPage from "./components/JoinPermissionPage";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";
import VideoSettingsContextProvider from "./contexts/video-settings";
import AuthTokenContextProvider from "./contexts/authtoken-context";
import { trpcClient } from "./client";

const queryClient = new QueryClient();

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route
              path="room/:roomId"
              element={
                <AuthTokenContextProvider>
                  <VideoSettingsContextProvider>
                    <JoinPermissionPage />
                  </VideoSettingsContextProvider>
                </AuthTokenContextProvider>
              }
            />
            <Route
              path="/"
              element={
                <AuthTokenContextProvider>
                  <VideoSettingsContextProvider>
                    <Home />
                  </VideoSettingsContextProvider>
                </AuthTokenContextProvider>
              }
            />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export default App;
