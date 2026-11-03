const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();


// =========================================================
// VALIDATION HELPERS
// =========================================================

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// At least:
// 8 characters
// 1 uppercase
// 1 lowercase
// 1 number
// 1 special character
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;


function validateEmail(email) {
  return emailRegex.test(email);
}


function validatePassword(password) {
  return passwordRegex.test(password);
}


function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}


function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    hasCompletedInitialImport: user.hasCompletedInitialImport,
  };
}


// =========================================================
// REGISTER
// =========================================================

router.post("/register", async (req, res) => {
  try {
    let {
      name,
      email,
      password,
      confirmPassword,
    } = req.body;


    // -----------------------------
    // Required fields
    // -----------------------------

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }


    // -----------------------------
    // Clean input
    // -----------------------------

    name = String(name).trim();
    email = String(email).trim().toLowerCase();
    password = String(password);
    confirmPassword = String(confirmPassword);


    // -----------------------------
    // Name validation
    // -----------------------------

    if (name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must contain at least 2 characters.",
      });
    }


    // -----------------------------
    // Email validation
    // -----------------------------

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }


    // -----------------------------
    // Password validation
    // -----------------------------

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.",
      });
    }


    // -----------------------------
    // Confirm password
    // -----------------------------

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }


    // -----------------------------
    // Check existing user
    // -----------------------------

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered. Please login or use another email.",
      });
    }


    // -----------------------------
    // Hash password
    // -----------------------------

    const hashedPassword = await bcrypt.hash(password, 12);


    // -----------------------------
    // Create user
    // -----------------------------

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
      hasCompletedInitialImport: false,
    });


    // -----------------------------
    // Generate token
    // -----------------------------

    const token = createToken(user);


    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: safeUser(user),
    });

  } catch (error) {

    // MongoDB duplicate email protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered. Please login or use another email.",
      });
    }

    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account. Please try again.",
    });
  }
});


// =========================================================
// LOGIN
// =========================================================

router.post("/login", async (req, res) => {
  try {
    let { email, password } = req.body;


    // -----------------------------
    // Required fields
    // -----------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }


    // -----------------------------
    // Clean email
    // -----------------------------

    email = String(email).trim().toLowerCase();
    password = String(password);


    // -----------------------------
    // Validate email format
    // -----------------------------

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }


    // -----------------------------
    // Find registered user
    // -----------------------------

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "No account found with this email. Please register first.",
      });
    }


    // -----------------------------
    // Check password
    // -----------------------------

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }


    // -----------------------------
    // Generate token
    // -----------------------------

    const token = createToken(user);


    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: safeUser(user),
    });

  } catch (error) {

    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
});


module.exports = router;