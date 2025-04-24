import { useState, useEffect } from "react";
import axios from "axios";
import HouseCard from "../components/HouseCard";
import ChatBox from "../components/ChatBox";

function Homes() {
  const [homes, setHomes] = useState([]);
  const [chatHomeId, setChatHomeId] = useState(null);
  const [chatOwnerName, setChatOwnerName] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const fetchHomes = async () => {
      try {
        const res = await axios.get("http://localhost:5000/homes");
        setHomes(res.data);
      } catch (error) {
        alert("Error fetching homes");
      }
    };

    fetchHomes();
  }, [userId]);

  const openChat = (homeId, ownerName) => {
    setChatHomeId(homeId);
    setChatOwnerName(ownerName);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setChatHomeId(null);
    setChatOwnerName("");
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center p-6"
      style={{ backgroundImage: "url(http://localhost:5000/light.jpg)" }}
    >
      <h1 className="text-4xl text-center mb-6 text-white text-shadow-lg">
        Available Homes
      </h1>
      <div
        className="grid gap-6" // Increased gap from 4 to 6
        style={{
          maxWidth: "1260px", // Increased to fit two 600px cards + gap (2 * 600px + 60px = 1260px)
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(2, 600px)", // Match card width
          justifyContent: "center",
          alignItems: "start", // Align cards to the top
        }}
      >
        {homes.map((home) => (
          <HouseCard key={home.id} home={home} openChat={openChat} />
        ))}
      </div>
      <ChatBox
        homeId={chatHomeId}
        ownerName={chatOwnerName}
        isOpen={isChatOpen}
        onClose={closeChat}
      />
    </div>
  );
}

export default Homes;
