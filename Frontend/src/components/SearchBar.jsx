import { useState } from "react";

function SearchBar({ onSearch }) {
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    if (!location.trim()) {
      alert("Please enter a location.");
      return;
    }
    onSearch(location);
  };

  return (
    <div className="flex justify-center mt-10">
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Enter city, state, or district"
        className="w-80 p-3 rounded-full border border-white bg-white bg-opacity-80 text-gray-800 shadow-lg mr-4"
      />
      <button
        onClick={handleSearch}
        className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-700 transform hover:scale-105"
      >
        Search
      </button>
    </div>
  );
}

export default SearchBar;
