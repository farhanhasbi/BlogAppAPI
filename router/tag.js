const express = require("express");
const passport = require("passport");
const { Tag } = require("../config/db-config.js");
const tagRouter = express.Router();
const filter = require("../component/filter.js");

// List Tag
tagRouter.get(
  "/list",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role !== "user") {
      return next();
    } else {
      return res.status(403).json({ error: "Access Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const { name, page = 1, pageSize = 10 } = req.query;
      const offset = (page - 1) * pageSize;
      const whereCondition = {};

      filter.searchTagName(whereCondition, name);

      const getTag = await Tag.findAll({
        order: [["id", "ASC"]],
        offset: offset,
        limit: pageSize,
        where: whereCondition,
      });
      if (getTag.length === 0) {
        return res
          .status(404)
          .json({ error: "No tag found with the specified criteria" });
      }

      const totalCount = await Tag.count({ where: whereCondition });
      const totalPages = Math.ceil(totalCount / pageSize);

      const response = {
        tag: getTag,
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
  }
);

// Create Tag
tagRouter.post(
  "/post",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role !== "user") {
      return next();
    } else {
      return res.status(403).json({ error: "Access Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const { name } = req.body;
      const newTag = await Tag.create({ name });
      return res.status(201).json(newTag);
    } catch (error) {
      console.error("Error Adding Tag:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Update Tag
tagRouter.put(
  "/edit/:id",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role !== "user") {
      return next();
    } else {
      return res.status(403).json({ error: "Access Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const id = req.params.id;
      const { name } = req.body;

      const [numUpdated, updateTag] = await Tag.update(
        { name },
        { where: { id }, returning: true }
      );

      if (numUpdated === 0) {
        res.status(404).json({ error: "Tag not found" });
      } else {
        res.status(200).json(updateTag[0]);
      }
    } catch (error) {
      console.error("Error Updating Tag", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Destroy Tag
tagRouter.delete(
  "/delete/:id",
  passport.authenticate("basic", { session: false }),
  (req, res, next) => {
    if (req.user && req.user.role !== "user") {
      return next();
    } else {
      return res.status(403).json({ error: "Access Forbidden" });
    }
  },
  async (req, res) => {
    try {
      const id = req.params.id;

      const numDelete = await Tag.destroy({ where: { id }, returning: true });

      if (numDelete === 0) {
        res.status(404).json({ error: "Tag Not Found" });
      } else {
        res.status(200).json({ message: "Success Deleting Tag" });
      }
    } catch (error) {
      console.error("Error Deleting Tag", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

module.exports = tagRouter;
