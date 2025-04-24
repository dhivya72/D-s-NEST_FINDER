import { useState } from "react";
import axios from "axios";
import SearchBar from "../components/SearchBar";

function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (location) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:5000/search?location=${encodeURIComponent(location)}`
      );
      setResults(res.data);
    } catch (error) {
      alert("Error fetching homes");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white relative"
      style={{ backgroundImage: "url(http://localhost:5000/home_gen.jpg)" }}
    >
      {/* Add padding-top to account for fixed navbar height (e.g., 60px) */}
      <div className="pt-16">
        {" "}
        {/* Adjust based on your navbar height */}
        <h1 className="text-5xl text-center text-shadow-lg">
          WELCOME TO NEST FINDER
        </h1>
        <SearchBar onSearch={handleSearch} />
        <div className="mt-10 flex flex-col items-center gap-4">
          {loading && (
            <div className="loading-spinner">
              <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading..." />
            </div>
          )}
          {results.length === 0 && !loading && (
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
