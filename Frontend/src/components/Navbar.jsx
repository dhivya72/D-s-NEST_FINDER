import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Navbar() {
  const { userId, fullName, role, logout } = useContext(AuthContext);
  const isLoggedIn = !!userId;
  const navigate = useNavigate();

  // Debug log to check rendering
  console.log("Navbar render:", { isLoggedIn, userId, fullName, role });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-black bg-opacity-80 flex justify-between items-center h-12 px-8 shadow-lg">
      {/* Left corner: Username when logged in */}
      <div className="text-white text-lg">
        {isLoggedIn && fullName ? `Logged in as ${fullName}` : ""}
      </div>

      {/* Right corner: Navigation links */}
      <div className="flex items-center">
        <Link
          to="/"
          className="text-white mx-4 text-lg uppercase hover:text-blue-400"
        >
          HOME
        </Link>

        {isLoggedIn ? (
          <>
            <Link
              to="/homes"
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              AVAILABLE HOMES
            </Link>
            <Link
              to="/upload"
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              Upload
            </Link>
            <Link
              to={
                role === "admin" ? "/admin-dashboard" : `/dashboard/${userId}`
              }
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="text-white mx-4 text-lg uppercase hover:text-blue-400"
            >
              Signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
