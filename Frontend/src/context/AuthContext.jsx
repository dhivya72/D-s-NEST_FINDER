import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(localStorage.getItem("userId") || null);
  const [fullName, setFullName] = useState(
    localStorage.getItem("full_name") || ""
  );
  const [role, setRole] = useState(localStorage.getItem("role") || "user"); // Add role state

  // Sync state with localStorage on mount only
  useEffect(() => {
    console.log("AuthContext useEffect: Syncing with localStorage", {
      userId: localStorage.getItem("userId"),
      full_name: localStorage.getItem("full_name"),
      role: localStorage.getItem("role"),
    });
  }, []);

  const login = (id, full_name, userRole) => {
    console.log("AuthContext login:", { id, full_name, role: userRole });
    localStorage.setItem("userId", id);
    localStorage.setItem("full_name", full_name);
    localStorage.setItem("role", userRole);
    setUserId(id);
    setFullName(full_name);
    setRole(userRole);
  };

  const logout = () => {
    console.log("AuthContext logout");
    localStorage.removeItem("userId");
    localStorage.removeItem("full_name");
    localStorage.removeItem("role");
    setUserId(null);
    setFullName("");
    setRole("user");
  };

  return (
    <AuthContext.Provider value={{ userId, fullName, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
