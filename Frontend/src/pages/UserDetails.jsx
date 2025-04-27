import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const UserDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    houseId,
    selectedDate,
    amount,
    days = 1,
    selectedDates = [],
  } = location.state ||
  JSON.parse(localStorage.getItem("bookingDetails") || "{}");
  const userId = localStorage.getItem("userId");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    idProof: "",
    persons: 1,
  });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Updated fixDate to return the date string as-is
  const fixDate = (dateStr) => {
    return dateStr;
  };

  // Use selectedDates directly without mapping over fixDate
  const correctedSelectedDates = selectedDates;
  console.log("Corrected Selected Dates:", correctedSelectedDates);

  // Use the first corrected date as start_date and count of dates as days
  const derivedSelectedDate =
    correctedSelectedDates.length > 0
      ? correctedSelectedDates[0]
      : fixDate(selectedDate) || null;
  const derivedDays = correctedSelectedDates.length || days || 1;
  const derivedAmount = amount;

  useEffect(() => {
    const missingFields = [];
    if (!houseId) missingFields.push("houseId");
    if (!userId) missingFields.push("userId");
    if (!derivedSelectedDate) missingFields.push("selectedDate");
    if (!derivedAmount) missingFields.push("amount");

    console.log("Booking Details:", {
      houseId,
      userId,
      selectedDate: derivedSelectedDate,
      amount: derivedAmount,
      days: derivedDays,
      selectedDates: correctedSelectedDates,
      missingFields,
    });

    if (missingFields.length > 0) {
      setError(
        `Missing booking details: ${missingFields.join(
          ", "
        )}. Please try again.`
      );
      setTimeout(() => navigate("/homes"), 3000);
    } else if (!userId) {
      setError("Please log in to proceed with booking.");
      setTimeout(() => navigate("/login"), 3000);
    }

    if (location.state) {
      localStorage.setItem("bookingDetails", JSON.stringify(location.state));
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      setError(
        "Failed to load Razorpay payment system. Please try again later."
      );
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [
    houseId,
    userId,
    derivedSelectedDate,
    derivedAmount,
    derivedDays,
    correctedSelectedDates,
    navigate,
    location.state,
  ]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async () => {
    if (isSending) return;
    if (!formData.phone || !formData.email) {
      setError("Phone and email are required.");
      return;
    }

    setIsSending(true);
    setError(null);

    const phone = formData.phone.startsWith("+91")
      ? formData.phone
      : `+91${formData.phone}`;

    try {
      const response = await axios.post("http://localhost:5000/api/send-otp", {
        phone,
        email: formData.email,
        userId,
      });
      console.log("Send OTP Response:", response.data);
      if (response.data.success) {
        setOtpSent(true);
        alert(
          `OTP sent to your mobile number (${phone}) and email (${formData.email}). Please check your SMS and inbox (including spam/junk folder). It is valid for 10 minutes.`
        );
      } else {
        setError(response.data.error || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("Send OTP Error:", err.message, err.response?.data);
      setError(
        err.response?.data?.error || "Failed to send OTP. Please try again."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifying) return;
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
    const missingFields = [];
    if (!houseId) missingFields.push("houseId");
    if (!userId) missingFields.push("userId");
    if (!derivedSelectedDate) missingFields.push("selectedDate");
    if (!derivedAmount) missingFields.push("amount");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(derivedSelectedDate))
      setError("Selected date must be in YYYY-MM-DD format.");
    if (!Number.isInteger(derivedDays) || derivedDays <= 0)
      setError("Days must be a positive integer.");
    if (missingFields.length > 0) {
      setError(
        `Missing booking details: ${missingFields.join(
          ", "
        )}. Please try again.`
      );
      return;
    }

    setIsVerifying(true);
    setError(null);

    const phone = formData.phone.startsWith("+91")
      ? formData.phone
      : `+91${formData.phone}`;

    try {
      const response = await axios.post(
        "http://localhost:5000/api/verify-otp",
        {
          phone,
          otp,
          userId,
        }
      );
      console.log("Verify OTP Response:", response.data);
      if (response.data.success) {
        let latestPrice = derivedAmount;
        try {
          const houseResponse = await axios.get(
            `http://localhost:5000/api/houses/${houseId}`
          );
          latestPrice = houseResponse.data.price || derivedAmount;
        } catch (fetchError) {
          console.error("Failed to fetch house price:", fetchError);
          setError("Failed to fetch latest house price. Using default amount.");
        }
        const amountInPaise = latestPrice * derivedDays * 100;

        if (amountInPaise > 100000000) {
          throw new Error(
            "Amount exceeds maximum allowed limit. Please reduce the booking amount."
          );
        }

        const orderResponse = await axios.post(
          "http://localhost:5000/api/order",
          {
            amount: amountInPaise,
            houseId,
            userId,
            userDetails: formData,
            days: derivedDays,
            start_date: derivedSelectedDate,
            selectedDates: correctedSelectedDates,
          }
        );
        console.log("Order Response:", orderResponse.data);
        const { orderId, amount, currency, bookingId } = orderResponse.data;

        if (!razorpayLoaded || typeof window.Razorpay === "undefined") {
          setError("Razorpay SDK not loaded. Please try again later.");
          return;
        }

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount,
          currency,
          name: "Nest Finder",
          description: `Booking for House ${houseId}`,
          order_id: orderId,
          handler: async (response) => {
            try {
              const verifyResponse = await axios.post(
                "http://localhost:5000/api/payment/verify",
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  houseId,
                  userId,
                  amount: latestPrice * derivedDays,
                  bookingId,
                }
              );
              console.log(
                "Payment Verification Response:",
                verifyResponse.data
              );
              navigate(`/booking-confirmation/${bookingId}`);
            } catch (error) {
              console.error("Payment verification failed:", error);
              setError("Payment verification failed. Please try again.");
            }
          },
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone,
          },
          theme: { color: "#3399cc" },
          modal: {
            ondismiss: () => {
              setError("Payment was cancelled or failed to complete.");
            },
          },
        };

        console.log("Razorpay Options:", options);
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response) => {
          console.error("Payment Failed:", response.error);
          setError("Payment failed: " + response.error.description);
        });
        rzp.open();
      } else {
        setError(response.data.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("Verify OTP Error:", err.message, err.response?.data);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to verify OTP. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">User Details</h2>
        <p className="mb-4 text-gray-700">
          Selected Dates:{" "}
          {correctedSelectedDates.length > 0
            ? correctedSelectedDates.join(", ")
            : derivedSelectedDate || "None"}
        </p>
        {!otpSent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                disabled={isSending}
              />
            </div>
            <div>
              <label className="block text-gray-700">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                placeholder="+91XXXXXXXXXX"
                required
                disabled={isSending}
              />
            </div>
            <div>
              <label className="block text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                disabled={isSending}
              />
            </div>
            <div>
              <label className="block text-gray-700">ID Proof</label>
              <input
                type="text"
                name="idProof"
                value={formData.idProof}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                disabled={isSending}
              />
            </div>
            <div>
              <label className="block text-gray-700">Number of Persons</label>
              <input
                type="number"
                name="persons"
                value={formData.persons}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="1"
                required
                disabled={isSending}
              />
            </div>
            <button
              onClick={handleSendOtp}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={
                isSending ||
                !houseId ||
                !userId ||
                !derivedSelectedDate ||
                !derivedAmount
              }
            >
              {isSending ? "Sending OTP..." : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-2 border rounded"
                required
                disabled={isVerifying}
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
              disabled={
                isVerifying ||
                !houseId ||
                !userId ||
                !derivedSelectedDate ||
                !derivedAmount
              }
            >
              {isVerifying ? "Verifying OTP..." : "Verify OTP"}
            </button>
            <button
              onClick={handleSendOtp}
              className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
              disabled={isSending || isVerifying}
            >
              {isSending ? "Sending OTP..." : "Resend OTP"}
            </button>
          </div>
        )}
        {error && <div className="text-red-500 mt-4">{error}</div>}
      </div>
    </div>
  );
};

export default UserDetails;
