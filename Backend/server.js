const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

const PORT = 5000;

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
  })
);
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
  const { full_name, email, password, role = "user" } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)",
      [full_name, email, hashed, role]
    );
    res
      .status(201)
      .json({ message: "Signup successful", userId: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Email already exists" });
    return res
      .status(500)
      .json({ message: "Signup failed", error: err.message });
  }
});

// ========== LOGIN ==========
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Login attempt:", { email });
  try {
    const [results] = await pool.query(
      "SELECT id, full_name, email, password, role FROM users WHERE email = ?",
      [email]
    );
    console.log("Query results:", results);
    if (results.length === 0) {
      console.log("No user found for email:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    console.log("Password match:", match);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      userId: user.id,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ message: "Login failed", error: err.message });
  }
});

// ========== ADMIN LOGIN ==========
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  console.log("Admin login attempt:", { email });
  try {
    const [results] = await pool.query(
      "SELECT id, full_name, email, password, role FROM users WHERE email = ? AND role = 'admin'",
      [email]
    );
    console.log("Admin query results:", results);
    if (results.length === 0) {
      console.log("No admin found for email:", email);
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    console.log("Admin password match:", match);
    if (!match) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    res.status(200).json({
      message: "Admin login successful",
      userId: user.id,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res
      .status(500)
      .json({ message: "Admin login failed", error: err.message });
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
      .json({ message: "Error fetching homes", error: err.message });
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
  const { userId } = req.body;
  try {
    await pool.query(
      "INSERT INTO bookings (user_id, house_id, payment_status) VALUES (?, ?, ?)",
      [userId, houseId, "pending"]
    );
    await pool.query("UPDATE houses SET is_booked = 1 WHERE id = ?", [houseId]);
    res.status(200).json({ message: "Home successfully booked" });
  } catch (err) {
    console.error("Booking error:", err);
    return res
      .status(500)
      .json({ message: "Booking failed", error: err.message });
  }
});

// ========== SEARCH ==========

app.get("/search", async (req, res) => {
  const location = req.query.location;
  if (!location)
    return res.status(400).json({ error: "Location is required." });

  try {
    const [results] = await pool.query(
      "SELECT * FROM houses WHERE LOWER(address) LIKE LOWER(?) AND is_booked = 0",
      [`%${location}%`]
    );
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).send("Database error");
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
    return res
      .status(500)
      .json({ message: "Fetch failed", error: err.message });
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
    return res.status(500).json({ message: "Send failed", error: err.message });
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

// ========== DASHBOARD DATA ==========
app.get("/dashboard", async (req, res) => {
  const userId = req.headers["user-id"];
  if (!userId) return res.status(400).json({ message: "User ID required" });

  try {
    const [userResults] = await pool.query(
      "SELECT full_name, email FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = userResults[0];

    const [wishlist] = await pool.query(
      "SELECT h.* FROM houses h JOIN wishlist w ON h.id = w.house_id WHERE w.user_id = ? ORDER BY w.added_at DESC",
      [userId]
    );

    const [recentActivity] = await pool.query(
      "SELECT h.address, h.price FROM houses h WHERE h.is_booked = 1 AND h.owner_name = (SELECT full_name FROM users WHERE id = ?) ORDER BY h.created_at DESC LIMIT 2",
      [userId]
    );

    res.json({
      user: { full_name: user.full_name, email: user.email },
      wishlist: wishlist.map((h) => {
        let parsedImages = [];
        try {
          parsedImages = JSON.parse(h.images || "[]");
        } catch (e) {
          console.error("Error parsing images for house", h.id, e);
        }
        return {
          id: h.id,
          address: h.address,
          price: h.price,
          images: parsedImages,
        };
      }),
      recentActivity,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: err.message });
  }
});

// ========== WISHLIST ENDPOINTS ==========
app.get("/user/wishlist/:userId", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT h.* FROM wishlist w JOIN houses h ON w.house_id = h.id WHERE w.user_id = ? ORDER BY w.added_at DESC",
      [req.params.userId]
    );
    res.json(
      rows.map((h) => {
        let parsedImages = [];
        try {
          parsedImages = JSON.parse(h.images || "[]");
        } catch (e) {
          console.error("Error parsing images for house", h.id, e);
        }
        return {
          id: h.id,
          address: h.address,
          price: h.price,
          images: parsedImages,
        };
      })
    );
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

app.post("/wishlist/add", async (req, res) => {
  const { userId, houseId } = req.body;
  try {
    const [result] = await pool.execute(
      "INSERT INTO wishlist (user_id, house_id, added_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE added_at = NOW()",
      [userId, houseId]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Added to wishlist" });
    } else {
      res.status(400).json({ success: false, message: "Already in wishlist" });
    }
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
});

app.delete("/wishlist/remove", async (req, res) => {
  const { userId, houseId } = req.body;
  try {
    const [result] = await pool.execute(
      "DELETE FROM wishlist WHERE user_id = ? AND house_id = ?",
      [userId, houseId]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Removed from wishlist" });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Wishlist item not found" });
    }
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
});

// ========== RAZORPAY ORDER ==========
app.post("/api/order", async (req, res) => {
  const { amount, houseId, userId } = req.body;
  try {
    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Step 1: Create a booking record with initial "pending" status
    const [bookingResult] = await pool.query(
      "INSERT INTO bookings (user_id, house_id, amount, payment_status) VALUES (?, ?, ?, ?)",
      [userId, houseId, parsedAmount, "pending"]
    );
    const bookingId = bookingResult.insertId;
    console.log("Booking created with ID:", bookingId);

    // Step 2: Create Razorpay order
    const options = {
      amount: Math.round(parsedAmount * 100), // Amount in paise
      currency: "INR",
      receipt: `receipt_${houseId}_${userId}_${bookingId}`, // Unique receipt with bookingId
    };
    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: bookingId, // Return bookingId to frontend
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ========== RAZORPAY PAYMENT VERIFICATION ==========
app.post("/api/payment/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    houseId,
    userId,
    amount,
  } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    try {
      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // Insert payment record
      await pool.query(
        "INSERT INTO payments (user_id, house_id, order_id, payment_id, amount, status) VALUES (?, ?, ?, ?, ?, ?)",
        [
          userId,
          houseId,
          razorpay_order_id,
          razorpay_payment_id,
          parsedAmount / 100,
          "success",
        ]
      );

      // Update booking status
      const [bookingResult] = await pool.query(
        "UPDATE bookings SET payment_status = ? WHERE user_id = ? AND house_id = ?",
        ["paid", userId, houseId]
      );
      console.log("Booking update affected rows:", bookingResult.affectedRows);

      // Fetch the booking ID
      const [bookingRows] = await pool.query(
        "SELECT id FROM bookings WHERE user_id = ? AND house_id = ?",
        [userId, houseId]
      );
      const bookingId = bookingRows[0]?.id;

      if (!bookingId) {
        throw new Error("Booking not found");
      }

      // Fetch booking details (including house info)
      const [bookingDetails] = await pool.query(
        `
        SELECT b.id AS booking_id, b.payment_status, h.address, h.price, h.owner_name, h.contact
        FROM bookings b
        JOIN houses h ON b.house_id = h.id
        WHERE b.id = ?
      `,
        [bookingId]
      );

      if (bookingDetails.length === 0) {
        throw new Error("Booking details not found");
      }

      const bookingInfo = bookingDetails[0];

      res.json({
        status: "success",
        bookingId: bookingInfo.booking_id,
        bookingDetails: {
          address: bookingInfo.address,
          price: bookingInfo.price,
          ownerName: bookingInfo.owner_name,
          contact: bookingInfo.contact,
          paymentStatus: bookingInfo.payment_status,
        },
      });
    } catch (error) {
      console.error("Payment storage failed:", error);
      res.status(500).json({ error: "Failed to store payment" });
    }
  } else {
    res.status(400).json({ error: "Invalid signature" });
  }
});

// ========== GET BOOKING DETAILS ==========
app.get("/api/booking/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  try {
    const [bookingDetails] = await pool.query(
      `
      SELECT b.id AS booking_id, b.payment_status, h.address, h.price, h.owner_name, h.contact
      FROM bookings b
      JOIN houses h ON b.house_id = h.id
      WHERE b.id = ?
    `,
      [bookingId]
    );

    if (bookingDetails.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(bookingDetails[0]);
  } catch (error) {
    console.error("Fetch booking details failed:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/delete-house/:id", async (req, res) => {
  const houseId = req.params.id;
  const userId = req.headers["user-id"];

  try {
    // Verify user is admin
    const [userResults] = await pool.query(
      "SELECT role FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0 || userResults[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Delete the house
    const [result] = await pool.query("DELETE FROM houses WHERE id = ?", [
      houseId,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "House not found" });
    }

    res.status(200).json({ message: "House deleted successfully" });
  } catch (err) {
    console.error("Error deleting house:", err);
    return res
      .status(500)
      .json({ message: "Error deleting house", error: err.message });
  }
});

app.get("/admin/bookings", async (req, res) => {
  const userId = req.headers["user-id"];

  try {
    const [userResults] = await pool.query(
      "SELECT role FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0 || userResults[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const [bookings] = await pool.query(
      `
      SELECT 
        b.id AS booking_id, 
        b.user_id, 
        b.house_id, 
        b.payment_status, 
        u.full_name AS user_name, 
        h.address AS house_address, 
        h.price AS house_price
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN houses h ON b.house_id = h.id
      ORDER BY b.id DESC
      `
    );

    res.status(200).json(bookings);
  } catch (err) {
    console.error("Error fetching bookings:", err);
    return res
      .status(500)
      .json({ message: "Error fetching bookings", error: err.message });
  }
});

const QRCode = require("qrcode");

app.get("/generate-qr/:homeId", async (req, res) => {
  const { homeId } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT upi_id, owner_name FROM houses WHERE id = ?",
      [homeId]
    );
    if (!rows.length) return res.status(404).send("House not found");

    const upiId = rows[0].upi_id;
    const ownerName = rows[0].owner_name;

    if (!upiId || !upiId.includes("@")) {
      return res.status(400).send("Invalid UPI ID format");
    }

    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      ownerName
    )}&am=1000&cu=INR`;
    const qrPath = `public/qr-${homeId}.png`;

    await QRCode.toFile(qrPath, upiUrl, { margin: 4 });
    res.sendFile(__dirname + `/${qrPath}`);
  } catch (err) {
    console.error("Error generating QR:", err);
    res.status(500).send("Error generating QR code");
  }
});

// ========== START SERVER ==========
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
