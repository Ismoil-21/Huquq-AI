import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const path = window.location.pathname;
      const isPublic = ["/", "/about", "/services", "/articles", "/contact"].includes(path);
      if (!isPublic && !path.startsWith("/login") && !path.startsWith("/register") && !path.startsWith("/admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
