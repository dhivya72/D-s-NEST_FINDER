import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

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
  }, []); // No dependencies since it doesn't use any props/state

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
  }, [userId]); // userId is a dependency because it's used in the headers

  useEffect(() => {
    fetchHouses();
    fetchBookings();
  }, [fetchHouses, fetchBookings]); // Dependencies are now stable

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
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Admin Dashboard</h2>
      <p>Welcome, Admin! Manage houses and bookings here.</p>

      {/* Houses Section */}
      <div style={{ marginBottom: "2rem" }}>
        <h3>Houses</h3>
        {houses.length === 0 ? (
          <p>No houses available.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {houses.map((house) => (
              <li
                key={house.id}
                style={{ margin: "1rem 0", textAlign: "left" }}
              >
                {house.address} - ₹{house.price}
                <button
                  onClick={() => handleDelete(house.id)}
                  style={{
                    marginLeft: "1rem",
                    backgroundColor: "red",
                    color: "white",
                    border: "none",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bookings Section */}
      <div>
        <h3>Bookings</h3>
        {bookings.length === 0 ? (
          <p>No bookings available.</p>
        ) : (
          <table
            style={{
              margin: "0 auto",
              borderCollapse: "collapse",
              width: "80%",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  Booking ID
                </th>
                <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  User
                </th>
                <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  House
                </th>
                <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  Price
                </th>
                <th style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                  Payment Status
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.booking_id}>
                  <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                    {booking.booking_id}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                    {booking.user_name}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                    {booking.house_address}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
                    ₹{booking.house_price}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "0.5rem" }}>
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
