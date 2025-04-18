import { Link } from "react-router-dom";

function Navbar() {
  const userId = localStorage.getItem("userId");

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("full_name");
    window.location.href = "/login";
  };

  return (
    <nav className="bg-black bg-opacity-80 flex justify-end items-center h-12 px-8 shadow-lg">
      {userId ? (
        <>
          <Link
            to="/homes"
            className="text-white mx-4 text-lg uppercase hover:text-blue-400"
          >
            Homes
          </Link>
          <Link
            to="/upload"
            className="text-white mx-4 text-lg uppercase hover:text-blue-400"
          >
            Upload
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
    </nav>
  );
}

export default Navbar;
