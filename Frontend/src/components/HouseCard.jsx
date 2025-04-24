import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useWishlist } from "../context/WishlistContext";
import { useNavigate } from "react-router-dom";

function HouseCard({ home, openChat }) {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(wishlist.includes(home.id));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [paymentError, setPaymentError] = useState(null);
  const navigate = useNavigate();

  const images = useMemo(() => {
    let imgArray = [];
    try {
      if (typeof home.images === "string") {
        imgArray = JSON.parse(home.images);
        if (!Array.isArray(imgArray)) {
          imgArray = home.images.split(",");
        }
      } else if (Array.isArray(home.images)) {
        imgArray = home.images;
      }
    } catch (err) {
      imgArray = home.images.split(",");
    }
    return imgArray;
  }, [home.images]);

  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to proceed with payment");
      return;
    }

    setPaymentError(null);

    try {
      const response = await axios.post("http://localhost:5000/api/order", {
        amount: home.price,
        houseId: home.id,
        userId,
      });
      const { orderId, amount, currency } = response.data;

      const res = await initializeRazorpay();
      if (!res) {
        setPaymentError("Razorpay SDK failed to load. Please try again.");
        return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "NestFinder",
        description: `Payment for ${home.address}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(
              "http://localhost:5000/api/payment/verify",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                houseId: home.id,
                userId,
                amount,
              }
            );
            if (verifyResponse.data.status === "success") {
              await axios.post(`http://localhost:5000/book/${home.id}`, {
                userId,
              });
              navigate(
                `/booking-confirmation/${verifyResponse.data.bookingId}`
              );
            }
          } catch (error) {
            console.error("Payment verification failed:", error);
            setPaymentError(
              "Payment verification failed. Please try again or contact support."
            );
          }
        },
        prefill: {
          name: localStorage.getItem("full_name"),
          email: localStorage.getItem("email"),
        },
        theme: { color: "#3b82f6" },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setPaymentError("Failed to initiate payment. Please try again.");
    }
  };

  const toggleWishlist = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to add to wishlist");
      return;
    }

    try {
      if (isInWishlist) {
        await axios.delete("http://localhost:5000/wishlist/remove", {
          data: { userId, houseId: home.id },
          headers: { "Content-Type": "application/json" },
        });
        removeFromWishlist(home.id);
      } else {
        await axios.post("http://localhost:5000/wishlist/add", {
          userId,
          houseId: home.id,
        });
        addToWishlist(home.id);
      }
      setIsInWishlist(!isInWishlist);
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      alert("Failed to update wishlist");
    }
  };

  const formattedPrice = (price) => {
    return price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: "1rem",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        width: "600px", // Increased from 550px
        height: "550px", // Increased from 500px
        transition: "transform 0.2s",
        overflow: "hidden",
      }}
      onMouseOver={(e) =>
        (e.currentTarget.style.transform = "translateY(-4px)")
      }
      onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div
        className="slideshow-container"
        style={{
          width: "100%",
          height: "350px", // Increased from 300px
          overflow: "hidden",
          display: "block",
        }}
      >
        {images.map((img, i) => (
          <img
            key={i}
            src={`http://localhost:5000${img}`}
            alt="House"
            style={{
              display: i === currentImageIndex ? "block" : "none",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              margin: "0",
            }}
          />
        ))}
      </div>
      <div
        style={{
          padding: "1.2rem", // Increased from 1rem
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.3rem", // Increased from 1.1rem
              fontWeight: "600",
              color: "#ffffff",
              lineHeight: "1.5rem",
            }}
          >
            {home.address}
          </h3>
          <p
            style={{
              fontSize: "1rem", // Increased from 0.9rem
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.4rem",
            }}
          >
            <strong>Owner:</strong> {home.owner_name}
          </p>
          <p
            style={{
              fontSize: "1rem", // Increased from 0.9rem
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.3rem",
            }}
          >
            <strong>Contact:</strong> {home.contact}
          </p>
          <p
            style={{
              fontSize: "1rem", // Increased from 0.9rem
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.3rem",
            }}
          >
            <strong>Price:</strong> ₹{formattedPrice(home.price)}
          </p>
        </div>
        {paymentError && (
          <div className="text-red-500 text-center mb-4">
            <p>{paymentError}</p>
            <button
              onClick={handlePayment}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry Payment
            </button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.6rem", // Increased from 0.5rem
            gap: "0.4rem", // Increased from 0.3rem
          }}
        >
          <button
            onClick={handlePayment}
            style={{
              flex: 1,
              padding: "0.6rem", // Increased from 0.5rem
              backgroundColor: "#ffffff",
              color: "#000000",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "1rem", // Increased from 0.9rem
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#e0e0e0")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#ffffff")
            }
          >
            <img
              src={
                navigator.onLine
                  ? "http://localhost:5000/heart_raw.png"
                  : "/fallback-heart.jpg"
              }
              alt="pay"
              style={{ width: "1.4rem", height: "1.4rem" }} // Increased from 1.2rem
              onError={(e) => {
                e.target.src = "/fallback-heart.jpg";
              }}
            />
            Book
          </button>
          <a
            href={`https://www.google.com/maps?q=${home.latitude},${home.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              padding: "0.6rem", // Increased from 0.5rem
              backgroundColor: "#8b5cf6",
              color: "#ffffff",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              textDecoration: "none",
              fontSize: "1rem", // Increased from 0.9rem
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#7c3aed")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#8b5cf6")
            }
          >
            <img
              src="http://localhost:5000/location_icon.jpg"
              alt="map"
              style={{ width: "1.4rem", height: "1.4rem" }} // Increased from 1.2rem
            />
            Map
          </a>
          <button
            onClick={() => openChat(home.id, home.owner_name)}
            style={{
              flex: 1,
              padding: "0.6rem", // Increased from 0.5rem
              backgroundColor: "#eab308",
              color: "#000000",
              borderRadius: "0.5rem",
              fontSize: "1rem", // Increased from 0.9rem
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#ca8a04")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#eab308")
            }
          >
            <span style={{ fontSize: "1.2rem" }}>•</span> Chat
          </button>
          <button
            onClick={toggleWishlist}
            style={{
              flex: 1,
              padding: "0.6rem", // Increased from 0.5rem
              backgroundColor: "#8b5cf6",
              color: "#ffffff",
              borderRadius: "0.5rem",
              fontSize: "1rem", // Increased from 0.9rem
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#7c3aed")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#8b5cf6")
            }
          >
            {isInWishlist ? "Remove" : "Wishlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HouseCard;
