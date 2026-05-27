import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LangProvider } from "./context/LangContext";
import { ChatPanelProvider } from "./context/ChatPanelContext";
import SiteLayout from "./components/SiteLayout";

import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Articles from "./pages/Articles";
import Contact from "./pages/Contact";
import { Login, Register } from "./pages/AuthPages";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";

function RequireGuest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/"         element={<Home />} />
        <Route path="/about"    element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/contact"  element={<Contact />} />
        {/* /profile redirects to home — profile is now a modal */}
        <Route path="/profile"  element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login"    element={<RequireGuest><Login /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/*"     element={<AdminPanel />} />
      <Route path="*"        element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ChatPanelProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ChatPanelProvider>
    </LangProvider>
  );
}