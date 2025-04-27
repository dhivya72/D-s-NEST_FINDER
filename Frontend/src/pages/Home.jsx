import { useState } from "react";
import axios from "axios";
import SearchBar from "../components/SearchBar";

function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bgError, setBgError] = useState(false);

  const handleSearch = async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchParams.location)
        params.append(
          "location",
          encodeURIComponent(searchParams.location.toLowerCase())
        );
      if (searchParams.endDate) params.append("endDate", searchParams.endDate);
      if (searchParams.maxPersons)
        params.append("maxPersons", searchParams.maxPersons);
      if (searchParams.houseType)
        params.append("houseType", searchParams.houseType);

      const response = await axios.get(
        `http://localhost:5000/search?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 200 && response.data) {
        let filteredResults = response.data;

        // Check booking availability if endDate is provided
        if (searchParams.endDate) {
          const bookingResponse = await axios.get(
            `http://localhost:5000/bookings`,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          const bookings = bookingResponse.data;
          const endDate = new Date(searchParams.endDate)
            .toISOString()
            .split("T")[0];

          filteredResults = filteredResults.map((home) => {
            const isBooked = bookings.some(
              (booking) =>
                booking.house_id === home.id &&
                booking.start_date <= endDate &&
                (booking.start_date >= endDate ||
                  new Date(booking.start_date).getTime() +
                    booking.days * 86400000 >=
                    new Date(endDate).getTime())
            );
            return { ...home, isBooked };
          });
        }

        setResults(filteredResults);
        console.log("Search results with booking status:", filteredResults);
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error fetching homes:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      setError("Error fetching homes. Please try again or check the server.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white relative"
      style={{
        backgroundImage: bgError
          ? "none"
          : "url(http://localhost:5000/home_gen.jpg)",
        backgroundColor: bgError ? "#333" : "transparent",
      }}
    >
      <div className="pt-16">
        <h1
          className="text-5xl text-center"
          style={{
            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
          }}
        >
          WELCOME TO NEST FINDER
        </h1>
        <SearchBar onSearch={handleSearch} />
        <div className="mt-10 flex flex-col items-center gap-4">
          {loading && (
            <div className="loading-spinner">
              <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading..." />
            </div>
          )}
          {error && <p className="text-lg text-red-500">{error}</p>}
          {results.length === 0 && !loading && !error && (
            <p className="text-lg">No homes found in that area.</p>
          )}
          {results.map((home) => (
            <div
              key={home.id}
              className="bg-black bg-opacity-70 p-4 w-11/12 max-w-xl rounded-lg shadow-lg hover:-translate-y-1 transition-transform"
            >
              <h3 className="text-xl text-yellow-400">
                {home.owner_name}'s Home
              </h3>
              <p className="text-lg">
                <strong className="text-red-400">Price:</strong> Rs.{home.price}
              </p>
              <p className="text-lg">
                <strong className="text-red-400">Location:</strong>{" "}
                {home.address}
              </p>
              <p className="text-lg">
                <strong className="text-red-400">Contact:</strong>{" "}
                {home.contact}
              </p>
              {home.isBooked && (
                <p className="text-lg text-red-500">
                  <strong>Status:</strong> Booked for the selected date
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <img
        src="http://localhost:5000/home_gen.jpg"
        alt=""
        style={{ display: "none" }}
        onError={() => setBgError(true)}
      />
    </div>
  );
}

export default Home;
