const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { v4 } = require("uuid");
const { User } = require("../config/db-config.js");
const authRouter = express.Router();
const filter = require("../component/filter.js");
const {
  isAuthenticated,
  moderatorAccess,
} = require("../middleware/authing.js");

// Set up multer to handle upload files
const DIR = "./public/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
  },
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(" ").join("-");
    cb(null, v4() + "-" + fileName);
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

// Register User
authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const url = req.protocol + "://" + req.get("host");
  try {
    // Check if the username already exists
    const existingUser = await User.findOne({
      where: {
        username,
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    if (req.session.user) {
      return res
        .status(403)
        .json({ error: "Please logout to access this function" });
    }

    const userModerator = await User.findByPk(1);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: userModerator ? "user" : "moderator",
      picture: url + "/public/" + req.file.filename,
    });
    req.session.user = newUser;
    res.status(201).json({ newUser });
  } catch (error) {
    console.error("Register failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login User
authRouter.post(
  "/login",
  passport.authenticate("basic", { session: false }),
  (req, res) => {
    try {
      req.session.user = req.user;
      return res.status(200).json({ message: "Login successful" });
    } catch (error) {
      console.error("Login failed", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Assign User to Author
authRouter.put("/assign-to-author/:id", moderatorAccess, async (req, res) => {
  try {
    const id = req.params.id;

    const existingUser = await User.findByPk(id);

    if (!existingUser) {
      return res.status(404).json({ error: "User Not Found" });
    }

    if (existingUser.role != "user") {
      return res.status(400).json({ error: "User already assigned to author" });
    }

    const [numUpdate, updateUserRole] = await User.update(
      { role: "author" },
      { where: { id }, returning: true }
    );

    if (numUpdate === 0) {
      res.status(404).json({ error: "User Not Found" });
    } else {
      return res.status(200).json(updateUserRole[0]);
    }
  } catch (error) {
    console.error("Error assign user to staff", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Edit Username and Password
authRouter.put("/edit-user/:id", isAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.id;
  const url = req.protocol + "://" + req.get("host");

  try {
    if (userId !== id) {
      return res
        .status(403)
        .json({ error: "Unauthorized: You can only edit your own profile" });
    }

    if (password) {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);

      await User.update(
        {
          username,
          password: hashedPassword,
          picture: url + "/public/" + req.file.filename,
        },
        { where: { id } }
      );
    } else {
      // If no new password provided, update only username and picture
      await User.update(
        {
          username,
          picture: url + "/public/" + req.file.filename,
        },
        { where: { id } }
      );
    }

    const updatedUser = await User.findByPk(id);

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(200).json(updatedUser);
      console.log("Success editing user");
    }
  } catch (error) {
    console.error("Error editing user", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete User
authRouter.delete("/delete-user/:id", moderatorAccess, async (req, res) => {
  try {
    const id = req.params.id;
    const numDelete = await User.destroy({ where: { id }, returning: true });
    if (numDelete === 0) {
      res.status(404).json({ error: "User Not Found" });
    } else {
      res.status(200).json({ message: "Success deleting data" });
    }
  } catch (error) {
    console.error("Error deleting user", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get All User
authRouter.get("/all-user", moderatorAccess, async (req, res) => {
  try {
    const { username, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;

    whereCondition = {};

    filter.searchUserName(whereCondition, username);

    const getUser = await User.findAll({
      order: [["id", "ASC"]],
      limit: pageSize,
      offset: offset,
      where: whereCondition,
    });
    if (getUser.length === 0) {
      return res
        .status(404)
        .json({ error: "No user found with the specified criteria" });
    }

    const totalCount = await User.count({ where: whereCondition });
    const totalPages = Math.ceil(totalCount / pageSize);

    const response = {
      user: getUser,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error Fetching Data", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

authRouter.post("/logout", isAuthenticated, async (req, res) => {
  try {
    const key = "/blog/list";

    // Delete the cache
    await redisClient.del(key);

    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", error);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        return res.status(200).json({ message: "Logout successful" });
      }
    });
  } catch (error) {
    // Handle errors
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = authRouter;
