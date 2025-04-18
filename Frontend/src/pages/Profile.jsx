import { useEffect, useState } from "react";
import axios from "axios";
import HouseCard from "../components/HouseCard";
import { useWishlist } from "../context/WishlistContext";

export default function Profile({ userId }) {
  const [houses, setHouses] = useState([]);
  const { wishlistIds } = useWishlist();

  useEffect(() => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    axios
      .get(`http://localhost:5000/user/wishlist/${userId}`)
      .then((res) => setHouses(res.data))
      .catch((err) => console.error("Error fetching wishlist:", err));
  }, [userId, wishlistIds]);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {houses.length ? (
        houses.map((h) => <HouseCard key={h.id} home={h} openChat={() => {}} />)
      ) : (
        <p>You have no houses in your wishlist.</p>
      )}
    </div>
  );
}
