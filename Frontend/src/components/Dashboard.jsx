import React, { useState, useEffect } from "react";
import axios from "axios";

const Dashboard = ({ userId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userId) {
        setError("No userId provided");
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get("http://localhost:5000/dashboard", {
          headers: { "user-id": userId },
        });
        setDashboardData(response.data);
      } catch (err) {
        const errorMessage = err.response
          ? `Server error: ${err.response.status} - ${JSON.stringify(
              err.response.data
            )}`
          : `Network error: ${err.message}`;
        setError(`Failed to fetch dashboard data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [userId]);

  if (loading)
    return <p className="text-center mt-8 text-gray-700">Loading...</p>;

  if (error) return <p className="text-center mt-8 text-red-600">{error}</p>;

  if (!dashboardData || !dashboardData.user)
    return (
      <p className="text-center mt-8 text-gray-700">
        No dashboard data available
      </p>
    );

  const { user, wishlist, recentActivity } = dashboardData;

  return (
    <div className="min-h-screen p-6 bg-gray-100 text-black">
      <h2 className="text-3xl font-bold text-center mb-8">My Dashboard</h2>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold">
          Welcome, {user.full_name || "Guest"}
        </h3>
        <p className="text-gray-700">Email: {user.email || "N/A"}</p>
      </div>

      <div className="mb-10">
        <h3 className="text-2xl font-semibold mb-4">My Wishlist</h3>
        {wishlist && wishlist.length > 0 ? (
          <ul className="grid md:grid-cols-2 gap-4">
            {wishlist.map((house) => (
              <li
                key={house.id}
                className="flex items-center bg-white border rounded-lg shadow-sm p-4"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-lg">
                    {house.address || "N/A"}
                  </h4>
                  <p className="text-gray-700">
                    Price: ₹{house.price || "N/A"}
                  </p>
                </div>
                {house.images && house.images.length > 0 && (
                  <img
                    src={`http://localhost:5000${house.images[0]}`}
                    alt="House"
                    className="w-32 h-24 object-cover rounded-md ml-4"
                    onError={(e) => (e.target.src = "/fallback-image.jpg")}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center">
            <img
              src="/a1431a6a-708c-44e0-a63a-68c09ecc062c.png"
              alt="Empty Wishlist"
              className="mx-auto w-24 h-24 opacity-80 mb-4"
            />
            <p className="text-gray-600">Your wishlist is empty</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-4">Recent Activity</h3>
        {recentActivity && recentActivity.length > 0 ? (
          <ul className="grid md:grid-cols-2 gap-4">
            {recentActivity.map((activity, index) => (
              <li
                key={index}
                className="bg-white border rounded-lg shadow-sm p-4"
              >
                <h4 className="font-bold text-lg">
                  {activity.address || "N/A"}
                </h4>
                <p className="text-gray-700">
                  Price: ₹{activity.price || "N/A"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-center">No recent activity</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
