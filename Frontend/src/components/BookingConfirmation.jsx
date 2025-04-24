import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function BookingConfirmation() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/booking/${bookingId}`
        );
        setBookingDetails(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load booking details");
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  if (error || !bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-xl text-red-500">{error || "Booking not found"}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-6 text-green-600">
          Booking Confirmed!
        </h2>
        <div className="space-y-4">
          <p className="text-lg">
            <strong>Booking ID:</strong> {bookingDetails.booking_id}
          </p>
          <p className="text-lg">
            <strong>Address:</strong> {bookingDetails.address}
          </p>
          <p className="text-lg">
            <strong>Owner:</strong> {bookingDetails.owner_name}
          </p>
          <p className="text-lg">
            <strong>Contact:</strong> {bookingDetails.contact}
          </p>
          <p className="text-lg">
            <strong>Price:</strong> ₹{bookingDetails.price}
          </p>
          <p className="text-lg">
            <strong>Payment Status:</strong>{" "}
            <span className="text-green-500">
              {bookingDetails.payment_status}
            </span>
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmation;
