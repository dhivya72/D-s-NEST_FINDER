import { Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const RequireAuth = ({ children }) => {
  const { userId } = useContext(AuthContext);
  return userId ? children : <Navigate to="/login" />;
};

export default RequireAuth;
