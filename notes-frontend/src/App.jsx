import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PublicNote from "./pages/PublicNote";

function App() {
  const [session, setSession] = useState(null);
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={
          session ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
        }
      />
      <Route path="/note/:id" element={<PublicNote />} />
      <Route
        path="/login"
        element={<Login theme={theme} setTheme={setTheme} />}
      />
      <Route
        path="/signup"
        element={<Signup theme={theme} setTheme={setTheme} />}
      />
      <Route
        path="/dashboard"
        element={
          session ? (
            <Dashboard
              session={session}
              theme={theme}
              setTheme={setTheme}
            />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

export default App;
