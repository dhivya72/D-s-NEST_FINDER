import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false); // Add admin toggle
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const endpoint = isAdmin ? "/admin-login" : "/login";
      const response = await axios.post(`http://localhost:5000${endpoint}`, {
        email,
        password,
      });

      const { userId, full_name, role } = response.data;
      console.log("Login successful:", { userId, full_name, role });

      // Update AuthContext (which handles localStorage)
      login(userId, full_name, role);

      // Debug: Verify localStorage
      console.log("localStorage after login:", {
        userId: localStorage.getItem("userId"),
        full_name: localStorage.getItem("full_name"),
        role: localStorage.getItem("role"),
      });

      // Navigate based on role
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/homes");
      }
    } catch (error) {
      console.error("Login failed:", error);
      console.log("Response:", error.response);
      console.log("Request:", error.request);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "An error occurred during login";
      alert(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md w-80"
      >
        <h2 className="text-2xl mb-4 text-center font-semibold">Login</h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="mr-2"
          />
          Admin Login
        </label>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
