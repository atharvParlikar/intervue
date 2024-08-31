import "./App.css";
import Home from "./components/Home";
import JoinPermissionPage from "./components/JoinPermissionPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";
import VideoSettingsContextProvider from "./contexts/video-settings";
import AuthTokenContextProvider from "./contexts/authtoken-context";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="room/:roomId" element={
          <AuthTokenContextProvider>
            <VideoSettingsContextProvider>
              <JoinPermissionPage />
            </VideoSettingsContextProvider>
          </AuthTokenContextProvider>
        } />
        <Route path="/" element={
          <AuthTokenContextProvider>
            <VideoSettingsContextProvider>
              <Home />
            </VideoSettingsContextProvider>
          </AuthTokenContextProvider>
        } />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
