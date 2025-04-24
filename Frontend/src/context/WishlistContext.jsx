import React, { createContext, useContext, useState } from "react";

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);

  const addToWishlist = (houseId) => {
    setWishlist((prev) => [...prev, houseId]);
  };

  const removeFromWishlist = (houseId) => {
    setWishlist((prev) => prev.filter((id) => id !== houseId));
  };

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
