import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";

function ChatBox({ homeId, ownerName, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const messagesRef = useRef(null);
  const userId = localStorage.getItem("userId");
  const fullName = localStorage.getItem("full_name") || "Guest";

  useEffect(() => {
    if (homeId && isOpen) {
      fetchMessages();
      socket.emit("join_room", { homeId, userType: "user" });
    }

    socket.on("new_message", (data) => {
      if (data.homeId === homeId) {
        setMessages((prev) => [
          ...prev,
          { sender: data.sender, message: data.message },
        ]);
      }
    });

    return () => {
      socket.off("new_message");
    };
  }, [homeId, isOpen]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/chat/messages/${homeId}`
      );
      setMessages(res.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !ownerName || !homeId) return;

    socket.emit("send_message", {
      homeId,
      sender: fullName,
      receiver: ownerName,
      message,
    });

    setMessages((prev) => [...prev, { sender: fullName, message }]);
    setMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-8 right-8 bg-black bg-opacity-80 rounded-2xl w-96 h-[550px] flex flex-col shadow-lg">
      <div className="bg-blue-500 text-white p-4 font-semibold text-lg text-center flex justify-between items-center">
        Chat with {ownerName}
        <button onClick={onClose} className="text-white hover:text-gray-200">
          ✖
        </button>
      </div>
      <div
        ref={messagesRef}
        className="flex-1 p-4 overflow-y-auto max-h-[380px] text-white"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.sender === fullName ? "text-right" : "text-left"}
          >
            <strong>{msg.sender}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <div className="flex p-2 border-t border-gray-600">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 rounded-full outline-none"
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatBox;
