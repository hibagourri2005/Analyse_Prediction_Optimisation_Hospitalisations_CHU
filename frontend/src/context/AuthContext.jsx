import { createContext, useContext, useState } from "react";
import api from "../api/axiosConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const id_service = localStorage.getItem("id_service");
    const nom_complet = localStorage.getItem("nom_complet");
    if (token && role) {
      return {
        token,
        role,
        id_service: id_service && id_service !== "null" ? parseInt(id_service, 10) : null,
        nom_complet: nom_complet && nom_complet !== "null" ? nom_complet : null,
      };
    }
    return null;
  });

  async function login(username, password) {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response = await api.post("/auth/login", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, role, id_service, nom_complet } = response.data;

    localStorage.setItem("token", access_token);
    localStorage.setItem("role", role);
    localStorage.setItem("id_service", id_service);
    localStorage.setItem("nom_complet", nom_complet);

    setUser({ token: access_token, role, id_service, nom_complet });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("id_service");
    localStorage.removeItem("nom_complet");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}