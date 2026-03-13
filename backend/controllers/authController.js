const jwt = require("jsonwebtoken");

const User = require("../models/User");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
};

const sanitizeRoles = (roles, allowAdmin = false) => {
  const defaultRoles = ["student"];
  if (!Array.isArray(roles) || roles.length === 0) {
    return defaultRoles;
  }

  const permittedRoles = allowAdmin ? ["student", "provider", "admin"] : ["student", "provider"];
  const filteredRoles = [...new Set(roles.filter((role) => permittedRoles.includes(role)))];
  return filteredRoles.length ? filteredRoles : defaultRoles;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, department, bio, avatarUrl, roles } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      department,
      bio,
      avatarUrl,
      roles: sanitizeRoles(roles)
    });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id),
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "phone", "department", "bio", "avatarUrl", "roles"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.roles !== undefined) {
      updates.roles = sanitizeRoles(updates.roles, req.user.roles.includes("admin"));
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select("-password");

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile
};
