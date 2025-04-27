import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
} from "react-router-dom";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Dashboard from "./components/Dashboard";
import { WishlistProvider } from "./context/WishlistContext";
import Navbar from "./components/Navbar";
import Homes from "./pages/Homes";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { useContext } from "react";
import RequireAuth from "./components/RequireAuth";
import BookingConfirmation from "./components/BookingConfirmation";
import RequireAdmin from "./components/RequireAdmin";
import AdminDashboard from "./components/AdminDashboard";
import AdminVisualizations from "./components/AdminVisualizations"; // Import the new component
import UserDetails from "./pages/UserDetails";

const DashboardWrapper = () => {
  const { userId: urlUserId } = useParams();
  const { userId: loggedInUser, role } = useContext(AuthContext);
  console.log("DashboardWrapper:", { urlUserId, loggedInUser, role });

  if (!loggedInUser) {
    console.log("Redirecting to login: No loggedInUser");
    return <Navigate to="/login" />;
  }

  const finalUserId = loggedInUser;
  console.log("Using finalUserId:", finalUserId);
  return <Dashboard userId={finalUserId} />;
};

function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/upload"
              element={
                <RequireAuth>
                  <Upload />
                </RequireAuth>
              }
            />
            <Route path="/dashboard/:userId" element={<DashboardWrapper />} />
            <Route path="/homes" element={<Homes />} />
            <Route
              path="/booking-confirmation/:bookingId"
              element={<BookingConfirmation />}
            />
            <Route
              path="/admin-dashboard"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin-visualizations"
              element={
                <RequireAdmin>
                  <AdminVisualizations />
                </RequireAdmin>
              }
            />
            <Route
              path="/user-details"
              element={
                <RequireAuth>
                  <UserDetails />
                </RequireAuth>
              }
            />
            <Route
              path="*"
              element={
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    minHeight: "100vh",
                    backgroundColor: "#f0f0f0",
                  }}
                >
                  <h2>404 - Page Not Found</h2>
                  <p>The page you are looking for does not exist.</p>
                </div>
              }
            />
          </Routes>
        </Router>
      </WishlistProvider>
    </AuthProvider>
  );
}

export default App;
