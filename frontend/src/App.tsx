import "./App.css";
import Home from "./components/Home";
import Room from "./components/Room";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="room/:roomId" element={<Room />} />
        <Route path="/" element={<Home />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
      </Routes>
    </Router>
  );
}

export default App;
