import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

function AdminDashboard() {
  const { userId } = useContext(AuthContext);
  const [houses, setHouses] = useState([]);
  const [bookings, setBookings] = useState([]);

  const fetchHouses = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5000/houses");
      setHouses(response.data);
    } catch (error) {
      console.error("Error fetching houses:", error);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5000/admin/bookings", {
        headers: { "user-id": userId },
      });
      setBookings(response.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      alert("Failed to fetch bookings: " + error.response?.data?.message);
    }
  }, [userId]);

  useEffect(() => {
    fetchHouses();
    fetchBookings();
  }, [fetchHouses, fetchBookings]);

  const handleDelete = async (houseId) => {
    if (window.confirm("Are you sure you want to delete this house?")) {
      try {
        await axios.delete(
          `http://localhost:5000/admin/delete-house/${houseId}`,
          {
            headers: { "user-id": userId },
          }
        );
        setHouses(houses.filter((house) => house.id !== houseId));
      } catch (error) {
        console.error("Error deleting house:", error);
        alert("Failed to delete house: " + error.response?.data?.message);
      }
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#F5F6FA",
        minHeight: "100vh",
      }}
    >
      <h1
        style={{ color: "#2E86AB", textAlign: "center", marginBottom: "2rem" }}
      >
        Admin Dashboard
      </h1>
      <p style={{ textAlign: "center", color: "#555", marginBottom: "2rem" }}>
        Manage houses and bookings here.
      </p>

      <Link
        to="/admin-visualizations"
        style={{
          display: "inline-block",
          padding: "0.5rem 1rem",
          backgroundColor: "#4ECDC4",
          color: "#FFFFFF",
          textDecoration: "none",
          borderRadius: "4px",
          marginBottom: "2rem",
          transition: "background-color 0.3s",
        }}
        onMouseOver={(e) => (e.target.style.backgroundColor = "#45B7D1")}
        onMouseOut={(e) => (e.target.style.backgroundColor = "#4ECDC4")}
      >
        View Visualizations
      </Link>

      {/* Houses Section */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ color: "#2E86AB", marginBottom: "1rem" }}>Houses</h2>
        {houses.length === 0 ? (
          <p style={{ color: "#777" }}>No houses available.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "1rem",
              maxWidth: "800px",
              margin: "0 auto",
            }}
          >
            {houses.map((house) => (
              <div
                key={house.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  padding: "1rem",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  {house.address} - ₹{house.price} ({house.house_type},{" "}
                  {house.max_persons} persons, Rating:{" "}
                  {house.rating != null
                    ? Number(house.rating).toFixed(1)
                    : "N/A"}
                  )
                </div>
                <button
                  onClick={() => handleDelete(house.id)}
                  style={{
                    backgroundColor: "#FF6B6B",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "background-color 0.3s",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#FF8787")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#FF6B6B")
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings Section */}
      <div>
        <h2 style={{ color: "#2E86AB", marginBottom: "1rem" }}>Bookings</h2>
        {bookings.length === 0 ? (
          <p style={{ color: "#777" }}>No bookings available.</p>
        ) : (
          <table
            style={{
              borderCollapse: "collapse",
              width: "80%",
              maxWidth: "1000px",
              margin: "0 auto",
              backgroundColor: "#FFFFFF",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#2E86AB", color: "#FFFFFF" }}>
                <th
                  style={{ padding: "0.75rem", borderBottom: "2px solid #ddd" }}
                >
                  Booking ID
                </th>
                <th
                  style={{ padding: "0.75rem", borderBottom: "2px solid #ddd" }}
                >
                  User
                </th>
                <th
                  style={{ padding: "0.75rem", borderBottom: "2px solid #ddd" }}
                >
                  House
                </th>
                <th
                  style={{ padding: "0.75rem", borderBottom: "2px solid #ddd" }}
                >
                  Price
                </th>
                <th
                  style={{ padding: "0.75rem", borderBottom: "2px solid #ddd" }}
                >
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr
                  key={booking.booking_id}
                  style={{ borderBottom: "1px solid #ddd" }}
                >
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {booking.booking_id}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {booking.user_name}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {booking.house_address}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    ₹{booking.house_price}
                  </td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {booking.payment_status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
