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
const nodemailer = require("nodemailer");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

dotenv.config();

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

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Connection Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();
const otps = new Map();
const otpCooldowns = new Map();

app.post("/api/send-otp", async (req, res) => {
  const { phone, email, userId } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Send OTP Request:`, { phone, email, userId });

  if (!phone || !email || !userId) {
    console.log(`[${requestId}] Missing required fields`);
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  const normalizedPhone = phone.replace("+91", "");
  const otpKey = `${userId}_${normalizedPhone}`;

  const now = Date.now();
  const lastSent = otpCooldowns.get(otpKey);
  if (lastSent && now - lastSent < 5000) {
    console.log(`[${requestId}] OTP cooldown active`);
    return res.status(429).json({
      success: false,
      error: "Please wait before requesting a new OTP",
    });
  }

  const otp = generateOtp();
  otps.set(otpKey, { otp, createdAt: Date.now(), verified: false });
  otpCooldowns.set(otpKey, now);

  console.log(`[${requestId}] Generated OTP:`, {
    userId,
    phone,
    normalizedPhone,
    email,
    otp,
  });

  let smsSuccess = false;
  let emailSuccess = false;

  try {
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
      params: {
        authorization: process.env.FAST2SMS_API_KEY,
        sender_id: "TXTIND",
        message: `Your OTP for NestFinder booking is ${otp}. It is valid for 10 minutes.`,
        route: "trans",
        numbers: normalizedPhone,
      },
    });
    console.log(
      `[${requestId}] SMS sent to ${normalizedPhone}:`,
      response.data
    );
    smsSuccess = true;
  } catch (smsError) {
    console.error(
      `[${requestId}] SMS Error:`,
      smsError.response ? smsError.response.data : smsError.message
    );
  }

  try {
    await transporter.sendMail({
      from: `"NestFinder" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP for Booking",
      text: `Your OTP for NestFinder booking is ${otp}. It is valid for 10 minutes.`,
      html: `<p>Your OTP for NestFinder booking is <b>${otp}</b>. It is valid for 10 minutes.</p>`,
    });
    console.log(`[${requestId}] Email sent to ${email}`);
    emailSuccess = true;
  } catch (emailError) {
    console.error(`[${requestId}] Email Error:`, emailError.message);
  }

  if (!smsSuccess && !emailSuccess) {
    otps.delete(otpKey);
    otpCooldowns.delete(otpKey);
    console.log(`[${requestId}] OTP deleted due to failure:`, otpKey);
    return res
      .status(500)
      .json({ success: false, error: "Failed to send OTP via SMS and email" });
  }

  res.json({ success: true });
});

app.post("/api/verify-otp", async (req, res) => {
  const { phone, otp, userId } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Verify OTP Request:`, { phone, userId });

  if (!phone || !otp || !userId) {
    console.log(`[${requestId}] Missing required fields`);
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  const normalizedPhone = phone.replace("+91", "");
  const trimmedOtp = String(otp).trim();
  const otpKey = `${userId}_${normalizedPhone}`;
  const storedOtpData = otps.get(otpKey);

  console.log(`[${requestId}] OTP lookup:`, {
    otpKey,
    otpExists: !!storedOtpData,
  });

  if (!storedOtpData) {
    console.log(`[${requestId}] No OTP found`);
    return res
      .status(400)
      .json({ success: false, error: "No OTP found for this user and phone" });
  }

  if (storedOtpData.verified) {
    console.log(`[${requestId}] OTP already verified`);
    return res
      .status(400)
      .json({ success: false, error: "OTP already verified" });
  }

  if (storedOtpData.otp !== trimmedOtp) {
    console.log(`[${requestId}] Invalid OTP`);
    return res.status(400).json({ success: false, error: "Invalid OTP" });
  }

  const now = Date.now();
  const otpAge = (now - storedOtpData.createdAt) / 1000 / 60;
  if (otpAge > 10) {
    otps.delete(otpKey);
    console.log(`[${requestId}] OTP expired and deleted:`, otpKey);
    return res.status(400).json({ success: false, error: "OTP expired" });
  }

  storedOtpData.verified = true;
  otps.delete(otpKey);
  console.log(`[${requestId}] OTP verified and deleted:`, otpKey);

  res.json({ success: true });
});
app.get("/api/bookings/:houseId", async (req, res) => {
  const { houseId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching booked dates for houseId ${houseId}`);

  try {
    const [bookings] = await pool.query(
      "SELECT start_date, days FROM bookings WHERE house_id = ? AND payment_status = 'paid'",
      [houseId]
    );

    const bookedDates = bookings.flatMap((booking) => {
      const start = new Date(booking.start_date);
      const dates = [];
      for (let i = 0; i < booking.days; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        dates.push(`${year}-${month}-${day}`);
      }
      return dates;
    });

    const uniqueBookedDates = [...new Set(bookedDates)];
    console.log(
      `[${requestId}] Booked dates for houseId ${houseId}:`,
      uniqueBookedDates
    );
    res.json({ bookedDates: uniqueBookedDates });
  } catch (error) {
    console.error(`[${requestId}] Error fetching booked dates:`, error);
    res.status(500).json({ error: "Failed to fetch booked dates" });
  }
});

app.get("/api/bookings/check/:houseId/:userId", async (req, res) => {
  const { houseId, userId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(
    `[${requestId}] Checking booking status for houseId ${houseId}, userId ${userId}`
  );

  try {
    const [bookings] = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE house_id = ? AND user_id = ? AND payment_status = 'paid'",
      [houseId, userId]
    );
    const hasBooked = bookings[0].count > 0;
    res.json({ hasBooked });
  } catch (error) {
    console.error(`[${requestId}] Error checking booking status:`, error);
    res.status(500).json({ error: "Failed to check booking status" });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { houseId, userId, days, start_date, amount, userDetails } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Booking Request:`, {
    houseId,
    userId,
    days,
    start_date,
    amount,
  });

  if (!houseId || !userId || !days || !start_date || !amount || !userDetails) {
    console.error(`[${requestId}] Missing required fields`);
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    console.error(`[${requestId}] Invalid start_date format`);
    return res.status(400).json({ error: "Invalid start_date format" });
  }

  if (!Number.isInteger(days) || days <= 0) {
    console.error(`[${requestId}] Invalid days value`);
    return res.status(400).json({ error: "Days must be a positive integer" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      "SELECT * FROM bookings WHERE house_id = ? FOR UPDATE",
      [houseId]
    );

    const [existingBookings] = await connection.query(
      "SELECT start_date, days FROM bookings WHERE house_id = ? AND payment_status = 'paid'",
      [houseId]
    );

    const newStartDate = new Date(start_date);
    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + (days - 1));

    let isConflict = false;
    for (const booking of existingBookings) {
      const bookedStartDate = new Date(booking.start_date);
      const bookedEndDate = new Date(bookedStartDate);
      bookedEndDate.setDate(bookedStartDate.getDate() + (booking.days - 1));
      if (
        (newStartDate <= bookedEndDate && newStartDate >= bookedStartDate) ||
        (newEndDate >= bookedStartDate && newEndDate <= bookedEndDate) ||
        (newStartDate <= bookedStartDate && newEndDate >= bookedEndDate)
      ) {
        isConflict = true;
        break;
      }
    }

    if (isConflict) {
      console.log(
        `[${requestId}] Date conflict detected for houseId ${houseId}`
      );
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "Requested dates are already booked" });
    }

    const userDetailsJson = JSON.stringify(userDetails);
    const [result] = await connection.query(
      "INSERT INTO bookings (house_id, user_id, start_date, days, amount, payment_status, user_details, booked_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
      [houseId, userId, start_date, days, amount, "paid", userDetailsJson]
    );

    const bookingId = result.insertId;
    console.log(`[${requestId}] Booking created with ID: ${bookingId}`);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userDetails.email,
      subject: "Booking Confirmation",
      text: `Your booking for house ID ${houseId} has been confirmed from ${start_date} for ${days} day(s). Total amount: ₹${amount}.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `[${requestId}] Booking confirmation email sent to ${userDetails.email}`
    );

    await connection.commit();

    const bookedDates = [];
    let currentDate = new Date(start_date);
    for (let i = 0; i < days; i++) {
      bookedDates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    io.emit("bookingUpdate", { houseId, bookedDates });

    res.json({ message: "Booking created successfully", bookingId });
  } catch (error) {
    console.error(`[${requestId}] Error creating booking:`, error);
    await connection.rollback();
    res.status(500).json({ error: "Failed to create booking" });
  } finally {
    connection.release();
  }
});

app.get("/api/houses/:id", async (req, res) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(
    `[${requestId}] Fetching house price for houseId ${req.params.id}`
  );

  try {
    const [rows] = await pool.query("SELECT price FROM houses WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length > 0) {
      res.json({ price: rows[0].price });
    } else {
      console.log(`[${requestId}] House not found: ${req.params.id}`);
      res.status(404).json({ error: "House not found" });
    }
  } catch (error) {
    console.error(`[${requestId}] Error fetching house:`, error);
    res.status(500).json({ error: "Failed to fetch house details" });
  }
});

app.post("/api/owner/booking", async (req, res) => {
  const { houseId, userId, userDetails, selectedDates } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Owner Booking Notification Request:`, {
    houseId,
    userId,
    userDetails,
    selectedDates,
  });

  if (!houseId || !userId || !userDetails || !selectedDates) {
    console.error(`[${requestId}] Missing required fields`);
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [houseRows] = await pool.query(
      "SELECT owner_name, contact, email FROM houses WHERE id = ?",
      [houseId]
    );

    if (!houseRows.length) {
      console.error(`[${requestId}] House not found for houseId: ${houseId}`);
      return res.status(404).json({ error: "House not found" });
    }

    const { owner_name, contact, email: ownerEmail } = houseRows[0];
    console.log(`[${requestId}] Owner details:`, {
      owner_name,
      contact,
      ownerEmail,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: ownerEmail || "default@example.com",
      subject: "New Booking Notification",
      text: `A new booking has been made for your house (ID: ${houseId}) by user ${
        userDetails.name
      } (${userDetails.email}). Dates: ${selectedDates.join(", ")}.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(
      `[${requestId}] Booking notification email sent to ${
        ownerEmail || "default@example.com"
      }`
    );

    if (contact) {
      const ownerContact = contact.startsWith("+91")
        ? contact
        : `+91${contact}`;
      try {
        const smsResponse = await axios.get(
          "https://www.fast2sms.com/dev/bulkV2",
          {
            params: {
              authorization: process.env.FAST2SMS_API_KEY,
              sender_id: "TXTIND",
              message: `New booking for your house (ID: ${houseId}) by ${
                userDetails.name
              }. Dates: ${selectedDates.join(", ")}.`,
              route: "trans",
              numbers: ownerContact.replace("+91", ""),
            },
          }
        );
        console.log(
          `[${requestId}] SMS sent to ${ownerContact}:`,
          smsResponse.data
        );
      } catch (smsError) {
        console.error(
          `[${requestId}] SMS Error:`,
          smsError.response?.data || smsError.message
        );
      }
    }

    res.json({ message: "Owner notified successfully" });
  } catch (error) {
    console.error(`[${requestId}] Error notifying owner:`, error);
    res.status(500).json({ error: "Failed to notify owner" });
  }
});

app.get("/api/reviews/:houseId/average", async (req, res) => {
  const { houseId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching average rating for houseId ${houseId}`);

  try {
    const [result] = await pool.query(
      "SELECT AVG(rating) as averageRating, COUNT(*) as reviewCount FROM reviews WHERE house_id = ?",
      [houseId]
    );
    const averageRating = result[0].averageRating
      ? parseFloat(result[0].averageRating).toFixed(1)
      : null;
    const reviewCount = result[0].reviewCount || 0;
    res.json({ averageRating, reviewCount });
  } catch (error) {
    console.error(`[${requestId}] Error fetching average rating:`, error);
    res
      .status(500)
      .json({ error: "Failed to fetch average rating and review count" });
  }
});

app.get("/api/reviews/:houseId/:userId", async (req, res) => {
  const { houseId, userId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(
    `[${requestId}] Fetching user rating for houseId ${houseId}, userId ${userId}`
  );

  try {
    const [reviews] = await pool.query(
      "SELECT rating FROM reviews WHERE house_id = ? AND user_id = ?",
      [houseId, userId]
    );
    const userRating = reviews.length > 0 ? reviews[0].rating : 0;
    res.json({ userRating });
  } catch (error) {
    console.error(`[${requestId}] Error fetching user rating:`, error);
    res.status(500).json({ error: "Failed to fetch user rating" });
  }
});

app.post("/api/reviews", async (req, res) => {
  const { houseId, userId, rating } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Review Submission:`, { houseId, userId, rating });

  try {
    if (
      !houseId ||
      !userId ||
      !rating ||
      rating < 0 ||
      rating > 5 ||
      !Number.isFinite(rating)
    ) {
      console.log(`[${requestId}] Invalid review data`);
      return res.status(400).json({ error: "Invalid review data" });
    }

    const [bookings] = await pool.query(
      "SELECT COUNT(*) as count FROM bookings WHERE house_id = ? AND user_id = ? AND payment_status = 'paid'",
      [houseId, userId]
    );
    if (bookings[0].count === 0) {
      console.log(
        `[${requestId}] User has not booked this house: userId ${userId}, houseId ${houseId}`
      );
      return res
        .status(403)
        .json({ error: "You must book this house to leave a review" });
    }

    await pool.query(
      "INSERT INTO reviews (house_id, user_id, rating, created_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE rating = ?, created_at = NOW()",
      [houseId, userId, rating, rating]
    );
    console.log(`[${requestId}] Review submitted successfully`);
    res.json({ message: "Review submitted successfully" });
  } catch (error) {
    console.error(`[${requestId}] Error submitting review:`, error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

app.post("/signup", async (req, res) => {
  const { full_name, email, password, role = "user" } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Signup Request:`, { full_name, email, role });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)",
      [full_name, email, hashed, role]
    );
    console.log(`[${requestId}] User created with ID: ${result.insertId}`);
    res
      .status(201)
      .json({ message: "Signup successful", userId: result.insertId });
  } catch (err) {
    console.error(`[${requestId}] Signup error:`, err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Login Request:`, { email });

  try {
    const [results] = await pool.query(
      "SELECT id, full_name, email, password, role FROM users WHERE email = ?",
      [email]
    );
    if (results.length === 0) {
      console.log(`[${requestId}] No user found for email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log(`[${requestId}] Password mismatch for email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`[${requestId}] Login successful for userId: ${user.id}`);
    res.status(200).json({
      message: "Login successful",
      userId: user.id,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error(`[${requestId}] Login error:`, err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Admin Login Request:`, { email });

  try {
    const [results] = await pool.query(
      "SELECT id, full_name, email, password, role FROM users WHERE email = ? AND role = 'admin'",
      [email]
    );
    if (results.length === 0) {
      console.log(`[${requestId}] No admin found for email: ${email}`);
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log(`[${requestId}] Password mismatch for admin: ${email}`);
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    console.log(`[${requestId}] Admin login successful for userId: ${user.id}`);
    res.status(200).json({
      message: "Admin login successful",
      userId: user.id,
      full_name: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error(`[${requestId}] Admin login error:`, err);
    res.status(500).json({ message: "Admin login failed", error: err.message });
  }
});

app.post("/add-house", upload.array("images", 4), async (req, res) => {
  const {
    owner_name,
    contact,
    address,
    price,
    latitude,
    longitude,
    max_persons,
    house_type,
    is_booked = 0,
    upi_id,
    owner_id,
  } = req.body;
  const imagePaths = req.files.map((file) => `/uploads/${file.filename}`);
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Add House Request:`, {
    owner_name,
    contact,
    address,
    price,
    latitude,
    longitude,
    max_persons,
    house_type,
    is_booked,
    upi_id,
    owner_id,
  });

  // Validation
  const validHouseTypes = ["1BHK", "2BHK", "3BHK", "Villa"];
  if (!validHouseTypes.includes(house_type)) {
    console.error(`[${requestId}] Invalid house type: ${house_type}`);
    return res.status(400).json({
      message: "Invalid house type. Must be one of: 1BHK, 2BHK, 3BHK, Villa",
    });
  }
  if (!Number.isInteger(Number(max_persons)) || Number(max_persons) <= 0) {
    console.error(`[${requestId}] Invalid max_persons: ${max_persons}`);
    return res
      .status(400)
      .json({ message: "Max persons must be a positive integer" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO houses (
        owner_name, contact, address, price, latitude, longitude, max_persons, house_type,
        images, is_booked, upi_id, owner_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        owner_name,
        contact,
        address,
        price,
        latitude,
        longitude,
        max_persons,
        house_type,
        JSON.stringify(imagePaths),
        is_booked,
        upi_id,
        owner_id,
      ]
    );
    console.log(`[${requestId}] House added with ID: ${result.insertId}`);
    res.status(200).json({ message: "House added successfully" });
  } catch (err) {
    console.error(`[${requestId}] Error adding house:`, err);
    res.status(500).json({ message: "Error saving house", error: err.message });
  }
});

app.get("/homes", async (req, res) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching all homes`);

  try {
    const [results] = await pool.query("SELECT * FROM houses");
    res.json(results);
  } catch (err) {
    console.error(`[${requestId}] Error fetching homes:`, err);
    res
      .status(500)
      .json({ message: "Error fetching homes", error: err.message });
  }
});

app.get("/houses", async (req, res) => {
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching all houses`);

  try {
    const [results] = await pool.query(`
      SELECT h.*, AVG(r.rating) as rating
      FROM houses h
      LEFT JOIN reviews r ON h.id = r.house_id
      GROUP BY h.id
    `);
    console.log(`[${requestId}] Found ${results.length} houses`);
    res.json(results);
  } catch (err) {
    console.error(`[${requestId}] Error fetching houses:`, err);
    res
      .status(500)
      .json({ message: "Error fetching houses", error: err.message });
  }
});

// Example: Update house_type in the database or response
app.get("/search", async (req, res) => {
  const { location, endDate } = req.query;
  let query =
    "SELECT h.*, AVG(r.rating) as rating FROM houses h LEFT JOIN reviews r ON h.id = r.house_id WHERE 1=1";
  const params = [];

  if (location) {
    query += " AND LOWER(h.address) LIKE ?";
    params.push(`%${location.toLowerCase()}%`);
  }

  query += " GROUP BY h.id";
  const [houses] = await pool.query(query, params);

  if (endDate) {
    const [bookings] = await pool.query("SELECT * FROM bookings");
    houses.forEach((home) => {
      const isBooked = bookings.some(
        (b) =>
          b.house_id === home.id &&
          b.start_date <= endDate &&
          (b.start_date >= endDate ||
            new Date(b.start_date).getTime() + b.days * 86400000 >=
              new Date(endDate).getTime())
      );
      home.isBooked = isBooked;
    });
  }

  res.json(houses);
});
app.get("/chat/messages/:homeId", async (req, res) => {
  const { homeId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching messages for homeId ${homeId}`);

  try {
    const [results] = await pool.query(
      "SELECT id, home_id, sender, receiver, message, created_at FROM messages WHERE home_id = ? ORDER BY created_at ASC",
      [homeId]
    );
    res.status(200).json(results);
  } catch (err) {
    console.error(`[${requestId}] Error fetching messages:`, err);
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

app.post("/chat/messages/:homeId", async (req, res) => {
  const { homeId } = req.params;
  const { sender, receiver, message } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Sending message for homeId ${homeId}:`, {
    sender,
    receiver,
    message,
  });

  try {
    const [result] = await pool.query(
      "INSERT INTO messages (home_id, sender, receiver, message, created_at) VALUES (?, ?, ?, ?, NOW())",
      [homeId, sender, receiver, message]
    );
    io.to(homeId).emit("new_message", {
      id: result.insertId,
      sender,
      message,
      homeId,
    });
    if (receiver) {
      io.to(`owner_${homeId}`).emit("new_message", {
        id: result.insertId,
        sender,
        message,
        homeId,
      });
    }
    console.log(`[${requestId}] Message sent successfully`);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(`[${requestId}] Error sending message:`, err);
    res.status(500).json({ message: "Send failed", error: err.message });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (data) => {
    const { homeId, userType } = data;
    socket.join(homeId);
    if (userType === "owner") socket.join(`owner_${homeId}`);
    console.log(`User ${socket.id} joined room ${homeId}, type: ${userType}`);
  });

  socket.on("send_message", async (data) => {
    const { homeId, sender, receiver, message } = data;
    try {
      const [result] = await pool.query(
        "INSERT INTO messages (home_id, sender, receiver, message, created_at) VALUES (?, ?, ?, ?, NOW())",
        [homeId, sender, receiver, message]
      );
      io.to(homeId).emit("new_message", {
        id: result.insertId,
        sender,
        message,
        homeId,
      });
      if (receiver) {
        io.to(`owner_${homeId}`).emit("new_message", {
          id: result.insertId,
          sender,
          message,
          homeId,
        });
      }
      console.log(`Message sent to room ${homeId}:`, { sender, message });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/dashboard", async (req, res) => {
  const userId = req.headers["user-id"];
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Dashboard Request for userId ${userId}`);

  if (!userId) {
    console.log(`[${requestId}] User ID required`);
    return res.status(400).json({ message: "User ID required" });
  }

  try {
    const [userResults] = await pool.query(
      "SELECT full_name, email FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0) {
      console.log(`[${requestId}] User not found: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResults[0];

    const [wishlist] = await pool.query(
      "SELECT h.* FROM houses h JOIN wishlist w ON h.id = w.house_id WHERE w.user_id = ? ORDER BY w.added_at DESC",
      [userId]
    );

    const [recentActivity] = await pool.query(
      "SELECT h.address, h.price, b.start_date, b.days FROM houses h JOIN bookings b ON h.id = b.house_id WHERE b.user_id = ? ORDER BY b.booked_at DESC LIMIT 2",
      [userId]
    );

    res.json({
      user: { full_name: user.full_name, email: user.email },
      wishlist: wishlist.map((h) => ({
        id: h.id,
        address: h.address,
        price: h.price,
        images: JSON.parse(h.images || "[]"),
      })),
      recentActivity,
    });
  } catch (err) {
    console.error(`[${requestId}] Dashboard error:`, err);
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: err.message });
  }
});

app.get("/user/wishlist/:userId", async (req, res) => {
  const { userId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching wishlist for userId ${userId}`);

  try {
    const [rows] = await pool.query(
      "SELECT h.* FROM wishlist w JOIN houses h ON w.house_id = h.id WHERE w.user_id = ? ORDER BY w.added_at DESC",
      [userId]
    );
    res.json(
      rows.map((h) => ({
        id: h.id,
        address: h.address,
        price: h.price,
        images: JSON.parse(h.images || "[]"),
      }))
    );
  } catch (error) {
    console.error(`[${requestId}] Error fetching wishlist:`, error);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

app.post("/wishlist/add", async (req, res) => {
  const { userId, houseId } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Adding to wishlist:`, { userId, houseId });

  try {
    const [result] = await pool.query(
      "INSERT INTO wishlist (user_id, house_id, added_at) VALUES (?, ?, NOW())",
      [userId, houseId]
    );
    console.log(`[${requestId}] Added to wishlist: houseId ${houseId}`);
    res.json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error(`[${requestId}] Error adding to wishlist:`, error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ success: false, message: "Already in wishlist" });
    } else {
      res.status(500).json({ error: "Failed to update wishlist" });
    }
  }
});

app.delete("/wishlist/remove", async (req, res) => {
  const { userId, houseId } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Removing from wishlist:`, { userId, houseId });

  try {
    const [result] = await pool.query(
      "DELETE FROM wishlist WHERE user_id = ? AND house_id = ?",
      [userId, houseId]
    );
    if (result.affectedRows > 0) {
      console.log(`[${requestId}] Removed from wishlist: houseId ${houseId}`);
      res.json({ success: true, message: "Removed from wishlist" });
    } else {
      console.log(
        `[${requestId}] Wishlist item not found: userId ${userId}, houseId ${houseId}`
      );
      res
        .status(404)
        .json({ success: false, message: "Wishlist item not found" });
    }
  } catch (error) {
    console.error(`[${requestId}] Error removing from wishlist:`, error);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
});

app.post("/api/order", async (req, res) => {
  const { amount, houseId, userId, days, start_date, userDetails } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Creating order:`, {
    amount,
    houseId,
    userId,
    days,
    start_date,
  });

  if (!houseId || !userId || !amount || !days || !start_date || !userDetails) {
    console.log(`[${requestId}] Missing required fields`);
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    console.log(`[${requestId}] Invalid start_date format: ${start_date}`);
    return res.status(400).json({ error: "Invalid start_date format" });
  }

  if (!Number.isInteger(days) || days <= 0) {
    console.log(`[${requestId}] Invalid days value: ${days}`);
    return res.status(400).json({ error: "Days must be a positive integer" });
  }

  try {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.log(`[${requestId}] Invalid amount: ${amount}`);
      return res.status(400).json({ error: "Invalid amount" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        "SELECT * FROM bookings WHERE house_id = ? FOR UPDATE",
        [houseId]
      );

      const [existingBookings] = await connection.query(
        "SELECT start_date, days FROM bookings WHERE house_id = ? AND payment_status = 'paid'",
        [houseId]
      );

      const newStartDate = new Date(start_date);
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(newStartDate.getDate() + (days - 1));

      let isConflict = false;
      for (const booking of existingBookings) {
        const bookedStartDate = new Date(booking.start_date);
        const bookedEndDate = new Date(bookedStartDate);
        bookedEndDate.setDate(bookedStartDate.getDate() + (booking.days - 1));

        if (
          (newStartDate <= bookedEndDate && newStartDate >= bookedStartDate) ||
          (newEndDate >= bookedStartDate && newEndDate <= bookedEndDate) ||
          (newStartDate <= bookedStartDate && newEndDate >= bookedEndDate)
        ) {
          isConflict = true;
          break;
        }
      }

      if (isConflict) {
        console.log(
          `[${requestId}] Date conflict detected for houseId ${houseId}`
        );
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Requested dates are already booked" });
      }

      const [bookingResult] = await connection.query(
        "INSERT INTO bookings (user_id, house_id, amount, payment_status, booked_at, days, start_date, user_details) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)",
        [
          userId,
          houseId,
          parsedAmount / 100,
          "pending",
          days,
          start_date,
          JSON.stringify(userDetails || {}),
        ]
      );
      const bookingId = bookingResult.insertId;

      const options = {
        amount: Math.round(parsedAmount),
        currency: "INR",
        receipt: `receipt_${houseId}_${userId}_${bookingId}`,
      };
      const order = await razorpay.orders.create(options);

      await connection.commit();

      console.log(`[${requestId}] Order created: orderId ${order.id}`);
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`[${requestId}] Order creation failed:`, error);
    res.status(500).json({ error: "Failed to create order", details: error });
  }
});

app.post("/api/payment/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    houseId,
    userId,
    amount,
    bookingId,
  } = req.body;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Verifying payment for bookingId ${bookingId}`, {
    houseId,
    userId,
    amount,
  });

  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.log(`[${requestId}] Invalid payment signature`);
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [updateResult] = await connection.query(
        "UPDATE bookings SET payment_status = 'paid', razorpay_payment_id = ?, razorpay_order_id = ?, razorpay_signature = ?, booked_at = NOW() WHERE id = ? AND payment_status = 'pending'",
        [razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId]
      );

      if (updateResult.affectedRows === 0) {
        console.log(
          `[${requestId}] Booking not found or already paid: ${bookingId}`
        );
        await connection.rollback();
        return res
          .status(404)
          .json({ error: "Booking not found or already paid" });
      }

      const [bookingRows] = await connection.query(
        "SELECT start_date, days, user_details FROM bookings WHERE id = ?",
        [bookingId]
      );
      if (bookingRows.length === 0) {
        console.log(
          `[${requestId}] Booking not found after update: ${bookingId}`
        );
        await connection.rollback();
        return res
          .status(404)
          .json({ error: "Booking not found after update" });
      }

      const { start_date, days, user_details } = bookingRows[0];
      const userDetails = JSON.parse(user_details || "{}");

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userDetails.email,
        subject: "Booking Confirmation",
        text: `Your booking for house ID ${houseId} has been confirmed from ${start_date} for ${days} day(s). Total amount: ₹${amount}.`,
      };

      await transporter.sendMail(mailOptions);
      console.log(
        `[${requestId}] Booking confirmation email sent to ${userDetails.email}`
      );

      const bookedDates = [];
      let currentDate = new Date(start_date);
      for (let i = 0; i < days; i++) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        bookedDates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      console.log(`[${requestId}] Booked dates:`, bookedDates);
      io.emit("bookingUpdate", { houseId, bookedDates });

      await connection.commit();

      console.log(`[${requestId}] Payment verified for bookingId ${bookingId}`);
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(`[${requestId}] Error verifying payment:`, error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

app.get("/api/booking/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(
    `[${requestId}] Fetching booking details for bookingId ${bookingId}`
  );

  try {
    const [bookingDetails] = await pool.query(
      `
      SELECT b.id AS booking_id, b.payment_status, b.start_date, b.days, b.amount, b.user_details,
             h.address, h.price, h.owner_name, h.contact
      FROM bookings b
      JOIN houses h ON b.house_id = h.id
      WHERE b.id = ?
    `,
      [bookingId]
    );

    if (bookingDetails.length === 0) {
      console.log(`[${requestId}] Booking not found: ${bookingId}`);
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(bookingDetails[0]);
  } catch (error) {
    console.error(`[${requestId}] Fetch booking details failed:`, error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/admin/delete-house/:id", async (req, res) => {
  const houseId = req.params.id;
  const userId = req.headers["user-id"];
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Delete House Request: houseId ${houseId}`);

  try {
    const [userResults] = await pool.query(
      "SELECT role FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0 || userResults[0].role !== "admin") {
      console.log(`[${requestId}] Admin access required for userId ${userId}`);
      return res.status(403).json({ message: "Admin access required" });
    }

    const [result] = await pool.query("DELETE FROM houses WHERE id = ?", [
      houseId,
    ]);
    if (result.affectedRows === 0) {
      console.log(`[${requestId}] House not found: ${houseId}`);
      return res.status(404).json({ message: "House not found" });
    }

    console.log(`[${requestId}] House deleted: ${houseId}`);
    res.status(200).json({ message: "House deleted successfully" });
  } catch (err) {
    console.error(`[${requestId}] Error deleting house:`, err);
    res
      .status(500)
      .json({ message: "Error deleting house", error: err.message });
  }
});

app.get("/admin/bookings", async (req, res) => {
  const userId = req.headers["user-id"];
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Fetching all bookings for admin`);

  try {
    const [userResults] = await pool.query(
      "SELECT role FROM users WHERE id = ?",
      [userId]
    );
    if (userResults.length === 0 || userResults[0].role !== "admin") {
      console.log(`[${requestId}] Admin access required for userId ${userId}`);
      return res.status(403).json({ message: "Admin access required" });
    }

    const [bookings] = await pool.query(
      `
      SELECT 
        b.id AS booking_id, 
        b.user_id, 
        b.house_id, 
        b.payment_status, 
        b.days,
        b.start_date,
        b.amount,
        b.user_details,
        u.full_name AS user_name, 
        h.address AS house_address, 
        h.price AS house_price
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN houses h ON b.house_id = h.id
      ORDER BY b.booked_at DESC
    `
    );

    res.status(200).json(bookings);
  } catch (err) {
    console.error(`[${requestId}] Error fetching bookings:`, err);
    res
      .status(500)
      .json({ message: "Error fetching bookings", error: err.message });
  }
});

app.get("/generate-qr/:homeId", async (req, res) => {
  const { homeId } = req.params;
  const requestId = req.headers["x-request-id"] || uuidv4();
  console.log(`[${requestId}] Generating QR for homeId ${homeId}`);

  try {
    const [rows] = await pool.query(
      "SELECT upi_id, owner_name FROM houses WHERE id = ?",
      [homeId]
    );
    if (!rows.length) {
      console.log(`[${requestId}] House not found: ${homeId}`);
      return res.status(404).json({ message: "House not found" });
    }

    const { upi_id, owner_name } = rows[0];
    if (!upi_id || !upi_id.includes("@")) {
      console.log(`[${requestId}] Invalid UPI ID for homeId ${homeId}`);
      return res.status(400).json({ message: "Invalid UPI ID format" });
    }

    const upiUrl = `upi://pay?pa=${upi_id}&pn=${encodeURIComponent(
      owner_name
    )}&am=1000&cu=INR`;
    const qrPath = `public/qr-${homeId}.png`;

    await QRCode.toFile(qrPath, upiUrl, { margin: 4 });
    res.sendFile(path.join(__dirname, qrPath));
  } catch (err) {
    console.error(`[${requestId}] Error generating QR:`, err);
    res
      .status(500)
      .json({ message: "Error generating QR code", error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
