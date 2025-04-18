import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistIds, setWishlistIds] = useState([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetchWishlist();
    }
  }, []);

  const fetchWishlist = async () => {
    const userId = localStorage.getItem("userId");
    try {
      const res = await axios.get(
        `http://localhost:5000/user/wishlist/${userId}`
      );
      setWishlistIds(res.data.map((house) => house.id));
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    }
  };

  const add = async (houseId) => {
    const userId = localStorage.getItem("userId");
    try {
      await axios.post("http://localhost:5000/wishlist/add", {
        userId,
        houseId,
      });
      setWishlistIds((prev) => [...prev, houseId]);
    } catch (err) {
      console.error("Error adding to wishlist:", err);
    }
  };

  const remove = async (houseId) => {
    const userId = localStorage.getItem("userId");
    try {
      await axios.delete("http://localhost:5000/wishlist/remove", {
        data: { userId, houseId },
      });
      setWishlistIds((prev) => prev.filter((id) => id !== houseId));
    } catch (err) {
      console.error("Error removing from wishlist:", err);
    }
  };

  return (
    <WishlistContext.Provider value={{ wishlistIds, add, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
