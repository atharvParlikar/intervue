import "./App.css";
import Home from "./components/Home";
import JoinPermissionPage from "./components/JoinPermissionPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";
import VideoSettingsContextProvider from "./contexts/video-settings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="room/:roomId" element={
          <VideoSettingsContextProvider>
            <JoinPermissionPage />
          </VideoSettingsContextProvider>
        } />
        <Route path="/" element={
          <VideoSettingsContextProvider>
            <Home />
          </VideoSettingsContextProvider>
        } />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
