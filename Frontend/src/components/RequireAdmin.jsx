import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const RequireAdmin = ({ children }) => {
  const { role } = useContext(AuthContext);
  return role === "admin" ? children : <Navigate to="/login" />;
};

export default RequireAdmin;
