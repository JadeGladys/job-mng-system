import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function App() {
  const [authMode, setAuthMode] = useState("login");

  return (
    authMode === "login" ? (
      <LoginPage onSwitchMode={() => setAuthMode("register")} />
    ) : (
      <RegisterPage onSwitchMode={() => setAuthMode("login")} />
    )
  );
}

export default App;
