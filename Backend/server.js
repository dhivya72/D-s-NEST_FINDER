const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});

const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "dhivya@72",
  database: "nf",
});

pool
  .getConnection()
  .then(() => {
    console.log("MySQL connected.");
  })
  .catch((err) => {
    console.error("MySQL connection error:", err);
  });

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + suffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
app.use("/uploads", express.static("uploads"));

// ========== SIGNUP ==========
app.post("/signup", async (req, res) => {
  const { full_name, email, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [full_name, email, hashed]
    );
    res
      .status(201)
      .json({ message: "Signup successful", userId: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Email already exists" });
    return res.status(500).json({ message: "Signup failed", error: err });
  }
});

// ========== LOGIN ==========
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [results] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (results.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    res.status(200).json({
      message: "Login successful",
      userId: user.id,
      full_name: user.full_name,
    });
  } catch (err) {
    return res.status(500).json({ message: "Login failed", error: err });
  }
});

// ========== ADD HOUSE ==========
app.post("/add-house", upload.array("images", 4), async (req, res) => {
  const {
    owner_name,
    contact,
    address,
    price,
    latitude,
    longitude,
    is_booked = 0,
  } = req.body;
  const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);

  try {
    const [result] = await pool.query(
      "INSERT INTO houses (owner_name, contact, address, price, latitude, longitude, images, is_booked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        owner_name,
        contact,
        address,
        price,
        latitude,
        longitude,
        JSON.stringify(imagePaths),
        is_booked,
      ]
    );
    res.status(200).send("House added successfully!");
  } catch (err) {
    console.error("Error inserting house:", err);
    return res.status(500).send("Error saving house.");
  }
});

// ========== FETCH HOMES ==========
app.get("/homes", async (req, res) => {
  try {
    const [results] = await pool.query(
      "SELECT * FROM houses WHERE is_booked = 0"
    );
    res.json(results);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching homes", error: err });
  }
});

// ========== FETCH ALL HOUSES ==========
app.get("/houses", async (req, res) => {
  try {
    const [results] = await pool.query("SELECT * FROM houses");
    res.json(results);
  } catch (err) {
    return res.status(500).send("Error fetching houses.");
  }
});

// ========== BOOK HOUSE ==========
app.post("/book/:id", async (req, res) => {
  const houseId = req.params.id;
  try {
    await pool.query("UPDATE houses SET is_booked = 1 WHERE id = ?", [houseId]);
    res.status(200).json({ message: "Home successfully booked" });
  } catch (err) {
    return res.status(500).json({ message: "Booking failed", error: err });
  }
});

// ========== SEARCH ==========
app.get("/search", async (req, res) => {
  const location = req.query.location;
  if (!location)
    return res.status(400).json({ error: "Location is required." });

  try {
    const [results] = await pool.query(
      "SELECT * FROM houses WHERE LOWER(address) LIKE LOWER(?)",
      [`%${location}%`]
    );
    res.json(results);
  } catch (err) {
    return res.status(500).send("Database error");
  }
});

app.get("/homes/search", async (req, res) => {
  const { city, state, district } = req.query;
  let q = "SELECT * FROM houses WHERE is_booked = 0";
  const params = [];
  if (city) {
    q += " AND city = ?";
    params.push(city);
  }
  if (state) {
    q += " AND state = ?";
    params.push(state);
  }
  if (district) {
    q += " AND district = ?";
    params.push(district);
  }

  try {
    const [results] = await pool.query(q, params);
    res.json(results);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error fetching homes", error: err });
  }
});

// ========== CHAT ==========
app.get("/chat/messages/:homeId", async (req, res) => {
  const { homeId } = req.params;
  try {
    const [results] = await pool.query(
      "SELECT * FROM messages WHERE home_id = ? ORDER BY created_at ASC",
      [homeId]
    );
    res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ message: "Fetch failed", error: err });
  }
});

app.post("/chat/messages/:homeId", async (req, res) => {
  const { homeId } = req.params;
  const { sender, receiver, message } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO messages (home_id, sender, receiver, message) VALUES (?, ?, ?, ?)",
      [homeId, sender, receiver, message]
    );
    io.to(homeId).emit("new_message", { sender, message, homeId });
    if (receiver)
      io.to(`owner_${homeId}`).emit("new_message", { sender, message, homeId });
    res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ message: "Send failed", error: err });
  }
});

// ========== SOCKET.IO ==========
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (data) => {
    const { homeId, userType } = data;
    socket.join(homeId);
    if (userType === "owner") socket.join(`owner_${homeId}`);
  });

  socket.on("send_message", async (data) => {
    const { homeId, sender, receiver, message } = data;
    try {
      await pool.query(
        "INSERT INTO messages (home_id, sender, receiver, message) VALUES (?, ?, ?, ?)",
        [homeId, sender, receiver, message]
      );
      io.to(homeId).emit("new_message", { sender, message, homeId });
      if (receiver)
        io.to(`owner_${homeId}`).emit("new_message", {
          sender,
          message,
          homeId,
        });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ========== START SERVER ==========
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
