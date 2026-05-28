import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, []);

  // BUG FIX #5: Har 5 soniyada /api/auth/me tekshirish — admin o'chirsa DARHOL logout
  // (avval 30 soniya edi — endi 5 soniya)
  useEffect(() => {
    if (!user) return;

    // Birinchi tekshirishni darhol qilish (sahifa yuklanganida)
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const { data } = await api.get("/auth/me");
        if (data?.user) {
          setUser((prev) => ({ ...prev, ...data.user }));
          localStorage.setItem(
            "user",
            JSON.stringify({ ...user, ...data.user }),
          );
        }
      } catch (err) {
        if (err.response?.status === 401) {
          // Akkaunt o'chirilgan yoki token yaroqsiz — darhol logout
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          window.location.href = "/login?deleted=1";
        }
      }
    };

    // 5 soniyada bir tekshirish (avval 30 edi)
    const interval = setInterval(checkAuth, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, password, fullName, email) => {
    const { data } = await api.post("/auth/register", {
      username,
      password,
      fullName,
      email,
    });
    if (data.needsVerification) return data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return { ...data.user, botUrl: data.botUrl || null };
  }, []);

  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await api.post("/auth/verify-otp", { email, otp });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const { data } = await api.post("/auth/resend-otp", { email });
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    return { ...data.user, botUrl: data.botUrl || null };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyOtp,
        resendOtp,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
