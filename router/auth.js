const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const { User } = require("../config/db-config.js");
const authRouter = express.Router();
const filter = require("../component/filter.js");

// Register User
authRouter.post("/register", async (req, res) => {
  const { username, password } = req.body;
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
    const userModerator = await User.findByPk(1);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role: userModerator ? "user" : "moderator",
    });
    console.log("Register success");
    res.status(201).json({ newUser });
  } catch (error) {
    console.error("Register failed");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Login User
authRouter.post(
  "/login",
  passport.authenticate("basic", { session: false }),
  (req, res) => {
    try {
      console.log("Login success");
      return res.status(200).json(req.user);
    } catch (error) {
      console.error("Login failed");
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Assign User to Author
authRouter.put(
  "/assign-to-author/:id",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role === "moderator") {
      return next();
    } else {
      return res.status(403).json({ error: "Acccess Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const id = req.params.id;

      const existingUser = await User.findByPk(id);

      if (!existingUser) {
        return res.status(404).json({ error: "User Not Found" });
      }

      if (existingUser.role != "user") {
        return res
          .status(400)
          .json({ error: "User already assigned to author" });
      }

      const [numUpdate, updateUserRole] = await User.update(
        { role: "author" },
        { where: { id }, returning: true }
      );

      if (numUpdate === 0) {
        res.status(404).json({ error: "User Not Found" });
      } else {
        console.log("Success assign user to staff");
        return res.status(200).json(updateUserRole[0]);
      }
    } catch (error) {
      console.error("Error assign user to staff", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Edit Username and Password
authRouter.put(
  "/edit-user/:id",
  passport.authenticate("basic", { session: false }),
  async (req, res) => {
    const { username, password } = req.body;
    const id = parseInt(req.params.id, 10);
    const userId = req.user.id;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      if (userId !== id) {
        return res
          .status(403)
          .json({ error: "Unauthorized: You can only edit your own profile" });
      }

      console.log(userId);

      const [numUpdated, updateUser] = await User.update(
        {
          username,
          password: hashedPassword,
        },
        { where: { id }, returning: true }
      );
      if (numUpdated === 0) {
        res.status(404).json({ error: "Item not found" });
      } else {
        res.status(200).json(updateUser[0]);
        console.log("Success editing user");
      }
    } catch (error) {
      console.error("Error editing user");
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete User
authRouter.delete(
  "/delete-user/:id",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role === "moderator") {
      return next();
    } else {
      return res.status(403).json({ error: "Acccess Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const id = req.params.id;
      const numDelete = await User.destroy({ where: { id }, returning: true });
      if (numDelete === 0) {
        res.status(404).json({ error: "User Not Found" });
      } else {
        res.status(200).json({ message: "Success deleting data" });
        console.log("Success deleting user");
      }
    } catch (error) {
      console.error("Error deleting user");
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Get All User
authRouter.get(
  "/all-user",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role === "moderator") {
      return next();
    } else {
      return res.status(403).json({ error: "Acccess Forbidden" });
    }
  },
  async (req, res) => {
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

      console.log("Success Fetching Data");
      return res.status(200).json(response);
    } catch (error) {
      console.log("Error Fetching Data", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = authRouter;

// Shen - moderator | artofthief12
// Ryuma - author | wolffang22
// Vienna - user | whitelotus20
// Jaya12 - user | jayajayajaya
