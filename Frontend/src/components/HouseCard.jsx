import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useWishlist } from "../context/WishlistContext";
import { useNavigate } from "react-router-dom";
import "./HouseCard.css";

function HouseCard({ home, openChat }) {
  const { wishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(wishlist.includes(home.id));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [paymentError, setPaymentError] = useState(null);
  const navigate = useNavigate();
  const [showCalendar, setShowCalendar] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hasBooked, setHasBooked] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date("2025-04-25"));
  const [retryCount, setRetryCount] = useState(0);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userDetails, setUserDetails] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Added loading state

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

  useEffect(() => {
    const fetchBookedDays = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/bookings/${home.id}`,
          { headers: { "x-request-id": "fetch-booked-days-" + Date.now() } }
        );
        const fetchedDates = response.data.bookedDates || [];
        setBookedDates(fetchedDates); // Use dates as-is, no adjustment
        console.log(`Booked dates for houseId ${home.id}:`, fetchedDates);
      } catch (error) {
        console.error(
          "Error fetching booked days:",
          error.message,
          error.response?.data
        );
        if (retryCount >= 3) {
          setBookedDates([]);
          console.log(
            "Max retries reached for fetching booked days. Booking disabled."
          );
        } else {
          setRetryCount(retryCount + 1);
        }
      } finally {
        setIsLoading(false); // Set loading to false after fetch
      }
    };

    const fetchAverageRating = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/reviews/${home.id}/average`
        );
        setAverageRating(response.data.averageRating || null);
      } catch (error) {
        console.error("Error fetching average rating:", error);
      }
    };

    const fetchUserRating = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/reviews/${home.id}/${userId}`
          );
          setUserRating(response.data.userRating || 0);
        } catch (error) {
          console.error("Error fetching user rating:", error);
        }
      }
    };

    const checkIfBooked = async () => {
      const userId = localStorage.getItem("userId");
      if (userId) {
        try {
          const response = await axios.get(
            `http://localhost:5000/api/bookings/check/${home.id}/${userId}`
          );
          setHasBooked(response.data.hasBooked);
        } catch (error) {
          console.error("Error checking booking status:", error);
        }
      }
    };

    fetchBookedDays();
    fetchAverageRating();
    fetchUserRating();
    checkIfBooked();
  }, [home.id, retryCount]);

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

  const handleBookClick = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to proceed with booking");
      return;
    }
    setShowCalendar(true);
    setPaymentError(null);
  };

  const handleMonthChange = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    if (isLoading) {
      return <div>Loading calendar...</div>;
    }

    const today = new Date("2025-04-25");
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();
    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const date = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${date}`;
      const isBooked = bookedDates.includes(dateString);
      const isSelected = selectedDates.includes(dateString);
      const isPast = currentDate < today;

      days.push(
        <div
          key={day}
          className={`calendar-day ${isBooked ? "booked" : "available"} ${
            isSelected ? "selected" : ""
          } ${isPast ? "past" : ""}`}
          onClick={() => {
            if (isPast || isBooked) return;

            let newSelectedDates = [...selectedDates];
            const index = newSelectedDates.indexOf(dateString);

            if (index === -1) {
              if (newSelectedDates.length === 0) {
                newSelectedDates.push(dateString);
              } else {
                const sortedDates = newSelectedDates
                  .map((d) => new Date(d))
                  .sort((a, b) => a - b);
                const earliest = sortedDates[0];
                const latest = sortedDates[sortedDates.length - 1];
                const current = new Date(dateString);

                const oneDayBeforeEarliest = new Date(earliest);
                oneDayBeforeEarliest.setDate(earliest.getDate() - 1);
                const oneDayAfterLatest = new Date(latest);
                oneDayAfterLatest.setDate(latest.getDate() + 1);

                const earliestYear = oneDayBeforeEarliest.getFullYear();
                const earliestMonth = String(
                  oneDayBeforeEarliest.getMonth() + 1
                ).padStart(2, "0");
                const earliestDate = String(
                  oneDayBeforeEarliest.getDate()
                ).padStart(2, "0");
                const earliestString = `${earliestYear}-${earliestMonth}-${earliestDate}`;

                const latestYear = oneDayAfterLatest.getFullYear();
                const latestMonth = String(
                  oneDayAfterLatest.getMonth() + 1
                ).padStart(2, "0");
                const latestDate = String(oneDayAfterLatest.getDate()).padStart(
                  2,
                  "0"
                );
                const latestString = `${latestYear}-${latestMonth}-${latestDate}`;

                if (
                  dateString === earliestString ||
                  dateString === latestString
                ) {
                  newSelectedDates.push(dateString);
                } else {
                  newSelectedDates = [dateString];
                }
              }
            } else {
              newSelectedDates.splice(index, 1);
            }

            const overlap = newSelectedDates.some((date) =>
              bookedDates.includes(date)
            );
            if (overlap) {
              setPaymentError(
                "Selected dates overlap with booked dates. Please choose different dates."
              );
              return;
            }

            setSelectedDates(newSelectedDates);
            setPaymentError(null);
          }}
          style={{
            cursor: isPast || isBooked ? "not-allowed" : "pointer",
            backgroundColor: isBooked
              ? "#ff0000"
              : isSelected
              ? "#00ff00"
              : "transparent",
            color: isBooked
              ? "#ffffff" // Ensure booked dates always have white text
              : isPast
              ? "#cccccc"
              : "#000000",
            pointerEvents: isPast || isBooked ? "none" : "auto",
          }}
        >
          {day}
        </div>
      );
    }

    return (
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <button onClick={() => handleMonthChange(-1)}>Previous</button>
          <span>
            {currentMonth.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button onClick={() => handleMonthChange(1)}>Next</button>
        </div>
        <div className="calendar-grid">{days}</div>
        {selectedDates.length > 0 && (
          <button
            onClick={() => {
              navigate("/user-details", {
                state: {
                  houseId: home.id,
                  selectedDates: selectedDates,
                  amount: home.price * selectedDates.length,
                },
              });
              setShowCalendar(false);
            }}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Proceed to Payment
          </button>
        )}
      </div>
    );
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!userDetails.name || !userDetails.phone || !userDetails.email) {
      setPaymentError("Please fill in all fields.");
      return;
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setPaymentError("User ID not found. Please log in.");
        return;
      }
      const response = await axios.post("http://localhost:5000/api/send-otp", {
        phone: userDetails.phone,
        email: userDetails.email,
        userId,
      });
      if (response.data.success) {
        setSentOtp(response.data.otp);
        setPaymentError(
          "OTP sent to your phone and email. Please enter it below."
        );
      } else {
        setPaymentError(response.data.error || "Failed to send OTP.");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setPaymentError("Failed to send OTP. Please try again.");
    }
  };

  const handleOtpVerify = async () => {
    if (otp === sentOtp?.toString()) {
      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const days = sortedDates.length;
      const amount = home.price * days;

      try {
        const userId = localStorage.getItem("userId") || Date.now().toString();
        const response = await axios.post("http://localhost:5000/api/order", {
          amount,
          houseId: home.id,
          userId,
          userDetails,
          start_date: startDate,
          days,
          selectedDates: selectedDates,
        });
        const {
          orderId,
          amount: orderAmount,
          currency,
          bookingId,
        } = response.data;

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: orderAmount,
          currency,
          name: "Nest Finder",
          description: `Booking for House ${home.id}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              await axios.post("http://localhost:5000/api/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                houseId: home.id,
                userId,
                amount,
                bookingId,
              });
              navigate(`/booking-confirmation/${bookingId}`);
            } catch (error) {
              console.error("Payment verification failed:", error);
              setPaymentError("Payment verification failed. Please try again.");
            }
          },
          prefill: {
            name: userDetails.name,
            email: userDetails.email,
            contact: userDetails.phone,
          },
          theme: { color: "#3399cc" },
          modal: {
            ondismiss: () => {
              setPaymentError("Payment was cancelled or failed to complete.");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        console.error("Error creating order:", error);
        setPaymentError("Failed to initiate payment. Please try again.");
      }
    } else {
      setPaymentError("Invalid OTP. Please try again.");
    }
  };

  const renderUserForm = () => {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            width: "400px",
            textAlign: "center",
          }}
        >
          <h4 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Enter User Details
          </h4>
          <form onSubmit={handleUserSubmit}>
            <input
              type="text"
              placeholder="Name"
              value={userDetails.name}
              onChange={(e) =>
                setUserDetails({ ...userDetails, name: e.target.value })
              }
              style={{ width: "80%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <input
              type="tel"
              placeholder="Phone (e.g., +918778086452)"
              value={userDetails.phone}
              onChange={(e) =>
                setUserDetails({ ...userDetails, phone: e.target.value })
              }
              style={{ width: "80%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <input
              type="email"
              placeholder="Email"
              value={userDetails.email}
              onChange={(e) =>
                setUserDetails({ ...userDetails, email: e.target.value })
              }
              style={{ width: "80%", padding: "0.5rem", marginBottom: "1rem" }}
            />
            <button
              type="submit"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#4CAF50",
                color: "white",
                borderRadius: "0.3rem",
              }}
            >
              Send OTP
            </button>
          </form>
          {paymentError && (
            <p style={{ color: "red", marginTop: "1rem" }}>{paymentError}</p>
          )}
          {sentOtp && (
            <div>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ width: "80%", padding: "0.5rem", marginTop: "1rem" }}
              />
              <button
                onClick={handleOtpVerify}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#2196F3",
                  color: "white",
                  borderRadius: "0.3rem",
                  marginTop: "1rem",
                }}
              >
                Verify OTP
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setShowUserForm(false);
              setUserDetails({ name: "", phone: "", email: "" });
              setOtp("");
              setSentOtp(null);
              setPaymentError(null);
            }}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#ef4444",
              color: "white",
              borderRadius: "0.3rem",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const handleStarClick = async (rating) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please log in to submit a review");
      return;
    }

    if (!hasBooked) {
      alert("You must book this house to leave a review");
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/reviews`, {
        houseId: home.id,
        userId,
        rating,
      });
      setUserRating(rating);
      const response = await axios.get(
        `http://localhost:5000/api/reviews/${home.id}/average`
      );
      setAverageRating(response.data.averageRating || null);
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  const renderStars = () => {
    const stars = [];
    const ratingToShow = userRating || averageRating || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={i <= ratingToShow ? "star-filled" : "star-empty"}
          onClick={() => handleStarClick(i)}
          style={{ cursor: hasBooked ? "pointer" : "default" }}
        >
          ★
        </span>
      );
    }
    return stars;
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
        width: "600px",
        height: "550px",
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
          height: "350px",
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
          padding: "1.2rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.3rem",
              fontWeight: "600",
              color: "#ffffff",
              lineHeight: "1.5rem",
            }}
          >
            {home.address}
          </h3>
          <p
            style={{
              fontSize: "1rem",
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.4rem",
            }}
          >
            <strong>Owner:</strong> {home.owner_name}
          </p>
          <p
            style={{
              fontSize: "1rem",
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.3rem",
            }}
          >
            <strong>Contact:</strong> {home.contact}
          </p>
          <p
            style={{
              fontSize: "1rem",
              opacity: "0.9",
              color: "#ffffff",
              marginTop: "0.3rem",
            }}
          >
            <strong>Price:</strong> ₹{formattedPrice(home.price)}
          </p>
          <div className="flex items-center my-2">
            {renderStars()}
            <span className="ml-2 text-white opacity-90">
              ({averageRating || "0"}/5)
            </span>
          </div>
        </div>
        {paymentError && (
          <div className="text-red-500 text-center mb-4">
            <p>{paymentError}</p>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "0.6rem",
            gap: "0.4rem",
          }}
        >
          <button
            onClick={handleBookClick}
            style={{
              flex: 1,
              padding: "0.6rem",
              backgroundColor: "#ffffff",
              color: "#000000",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              fontSize: "1rem",
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
              style={{ width: "1.4rem", height: "1.4rem" }}
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
              padding: "0.6rem",
              backgroundColor: "#8b5cf6",
              color: "#ffffff",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              textDecoration: "none",
              fontSize: "1rem",
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
              style={{ width: "1.4rem", height: "1.4rem" }}
            />
            Map
          </a>
          <button
            onClick={() => openChat(home.id, home.owner_name)}
            style={{
              flex: 1,
              padding: "0.6rem",
              backgroundColor: "#eab308",
              color: "#000000",
              borderRadius: "0.5rem",
              fontSize: "1rem",
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
              padding: "0.6rem",
              backgroundColor: "#8b5cf6",
              color: "#ffffff",
              borderRadius: "0.5rem",
              fontSize: "1rem",
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

      {showCalendar && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              width: "400px",
              textAlign: "center",
            }}
          >
            <h4 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              Select Dates
            </h4>
            {renderCalendar()}
            <button
              onClick={() => {
                setShowCalendar(false);
                setSelectedDates([]);
                setPaymentError(null);
              }}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#ef4444",
                color: "white",
                borderRadius: "0.3rem",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {showUserForm && renderUserForm()}
    </div>
  );
}

export default HouseCard;
