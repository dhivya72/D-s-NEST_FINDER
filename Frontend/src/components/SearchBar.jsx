import React, { useState } from "react";

const SearchBar = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useState({
    location: "",
    endDate: "",
    maxPersons: "",
    houseType: "",
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({ ...prev, [name]: value }));
    if (name === "location" && value.trim() === "") {
      setError(null);
    }
  };

  const handleSearch = () => {
    const location = searchParams.location.trim();
    if (
      !location &&
      !searchParams.endDate &&
      !searchParams.maxPersons &&
      !searchParams.houseType
    ) {
      setError("Please fill at least one search field.");
      return;
    }

    if (onSearch && location) {
      console.log("SearchBar: Triggering search with params:", searchParams);
      onSearch({ ...searchParams, location });
      setError(null);
    } else {
      setError("Please enter a location to search.");
    }
  };

  const handleKeyPress = (e) => {
    if (
      e.key === "Enter" &&
      (searchParams.location.trim() ||
        searchParams.endDate ||
        searchParams.maxPersons ||
        searchParams.houseType)
    ) {
      handleSearch();
    }
  };

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
      onKeyPress={handleKeyPress}
    >
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "1rem",
          borderRadius: "0.3rem",
        }}
      >
        <input
          type="text"
          name="location"
          value={searchParams.location}
          onChange={handleChange}
          placeholder="Search by city..."
          style={{
            padding: "0.5rem",
            borderRadius: "0.3rem",
            border: "1px solid #ccc",
            width: "200px",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        />
        <input
          type="date"
          name="endDate"
          value={searchParams.endDate}
          onChange={handleChange}
          style={{
            padding: "0.5rem",
            borderRadius: "0.3rem",
            border: "1px solid #ccc",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        />
        <select
          name="maxPersons"
          value={searchParams.maxPersons}
          onChange={handleChange}
          style={{
            padding: "0.5rem",
            borderRadius: "0.3rem",
            border: "1px solid #ccc",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          <option value="">Max Persons</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4+</option>
        </select>
        <select
          name="houseType"
          value={searchParams.houseType}
          onChange={handleChange}
          style={{
            padding: "0.5rem",
            borderRadius: "0.3rem",
            border: "1px solid #ccc",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          <option value="">Accommodation Type</option>
          <option value="1BHK">1BHK</option>
          <option value="2BHK">2BHK</option>
          <option value="3BHK">3BHK</option>
          <option value="Villa">Villa</option>
        </select>
        <button
          onClick={handleSearch}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            borderRadius: "0.3rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </div>
      {error && (
        <div
          style={{
            color: "#ff3333",
            fontSize: "1.2rem",
            marginTop: "0.5rem",
            backgroundColor: "rgba(255, 255, 0.9)",
            padding: "0.5rem",
            borderRadius: "0.3rem",
            border: "2px solid #ff5555",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
