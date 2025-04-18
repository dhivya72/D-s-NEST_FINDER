import { useState, useEffect } from "react";
import axios from "axios";

function HouseCard({ home, openChat }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 🔐 Safely handle home.images
  let images = [];
  try {
    if (typeof home.images === "string") {
      // Try parsing JSON string or fallback to comma-separated
      images = JSON.parse(home.images);
      if (!Array.isArray(images)) {
        images = home.images.split(",");
      }
    } else if (Array.isArray(home.images)) {
      images = home.images;
    }
  } catch (err) {
    // If JSON.parse fails, try comma split
    images = home.images.split(",");
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  const handleBook = async () => {
    try {
      await axios.post(`http://localhost:5000/book/${home.id}`);
      alert("Home successfully booked");
    } catch (error) {
      alert("Booking failed");
    }
  };

  return (
    <div className="bg-black bg-opacity-60 rounded-2xl shadow-lg flex flex-col h-full hover:-translate-y-1 transition-transform">
      <div className="slideshow-container">
        {images.map((img, i) => (
          <img
            key={i}
            src={`http://localhost:5000${img}`}
            alt="House"
            className={i === currentImageIndex ? "active" : "hidden"}
          />
        ))}
      </div>
      <div className="p-6 flex flex-col flex-1 justify-between">
        <div>
          <h3 className="text-2xl font-semibold">{home.address}</h3>
          <p className="text-lg opacity-90">
            <strong>Owner:</strong> {home.owner_name}
          </p>
          <p className="text-lg opacity-90">
            <strong>Contact:</strong> {home.contact}
          </p>
          <p className="text-lg opacity-90">
            <strong>Price:</strong> ₹{home.price}
          </p>
        </div>
        <div className="flex justify-between mt-4 gap-2">
          <button
            onClick={handleBook}
            className="flex-1 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <img
              src="http://localhost:5000/heart_raw.jpg"
              alt="book"
              className="w-5 h-5"
            />
            Book
          </button>
          <a
            href={`https://www.google.com/maps?q=${home.latitude},${home.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 bg-green-500 text-white rounded-full hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <img
              src="http://localhost:5000/location_icon.jpg"
              alt="map"
              className="w-5 h-5"
            />
            Map
          </a>
          <button
            onClick={() => openChat(home.id, home.owner_name)}
            className="flex-1 py-2 bg-yellow-500 text-black rounded-full hover:bg-yellow-600"
          >
            💬 Chat
          </button>
        </div>
      </div>
    </div>
  );
}

export default HouseCard;
