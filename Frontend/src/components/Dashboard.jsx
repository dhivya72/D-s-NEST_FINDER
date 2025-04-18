import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const Dashboard = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileResponse, wishlistResponse] = await Promise.all([
          axios.get(`http://localhost:5000/user/profile/${userId}`, {
            withCredentials: true,
          }),
          axios.get(`http://localhost:5000/user/wishlist/${userId}`, {
            withCredentials: true,
          }),
        ]);
        setProfile({
          user: profileResponse.data.user,
          ownedHouses: profileResponse.data.ownedHouses,
          bookedHouses: profileResponse.data.bookedHouses,
          wishlist: wishlistResponse.data,
        });
      } catch (err) {
        setError("Failed to fetch profile or wishlist");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!profile) return <p>No profile data</p>;

  const { user, ownedHouses, bookedHouses, wishlist } = profile;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Welcome, {user.full_name}!</h2>
      <h3>Profile</h3>
      <p>Email: {user.email}</p>
      <h3>Owned Houses</h3>
      {ownedHouses.length > 0 ? (
        <ul>
          {ownedHouses.map((house) => (
            <li key={house.id}>
              {house.address} - ₹{house.price}
              {house.images && house.images.length > 0 && (
                <img
                  src={house.images[0]}
                  alt="House"
                  style={{ width: "100px" }}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No owned houses</p>
      )}
      <h3>Booked Houses</h3>
      {bookedHouses.length > 0 ? (
        <ul>
          {bookedHouses.map((house) => (
            <li key={house.id}>
              {house.address} - ₹{house.price}
              {house.images && house.images.length > 0 && (
                <img
                  src={house.images[0]}
                  alt="House"
                  style={{ width: "100px" }}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No booked houses</p>
      )}
      <h3>Wishlist</h3>
      {wishlist.length > 0 ? (
        <ul>
          {wishlist.map((house) => (
            <li key={house.id}>
              {house.address} - ₹{house.price}
              {house.images && house.images.length > 0 && (
                <img
                  src={house.images[0]}
                  alt="House"
                  style={{ width: "100px" }}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No items in wishlist</p>
      )}
    </div>
  );
};

export default Dashboard;
