const express = require("express");
const passport = require("passport");
const {
  Tag,
  Blog,
  User,
  BlogTag,
  BlogVote,
  Comment,
  Reply,
} = require("../config/db-config.js");
const blogRouter = express.Router();
const filter = require("../component/filter.js");
const { serializeBlog, serializeBlogDetail } = require("../component/order.js");
const redisClient = require("../config/redis.js");
const checkCache = require("../middleware/caching.js");
const { isAuthenticated, workerAccess } = require("../middleware/authing.js");

// List Blog
blogRouter.get("/list", isAuthenticated, checkCache, async (req, res) => {
  try {
    const { title, page = 1, pageSize = 10 } = req.query;
    const offset = (page - 1) * pageSize;
    const whereCondition = {};
    const key = req.originalUrl;

    filter.searchTitleBlog(whereCondition, title);

    const getBlog = await Blog.findAll({
      order: [["id", "ASC"]],
      where: whereCondition,
      limit: pageSize,
      offset: offset,
      include: [
        {
          model: User,
          as: "author",
        },
      ],
    });
    if (getBlog.length === 0) {
      return res
        .status(404)
        .json({ error: "No blog found with the specified criteria" });
    }

    const totalCount = await Blog.count({ where: whereCondition });
    const totalPages = Math.ceil(totalCount / pageSize);

    const serializedBlogs = getBlog.map(serializeBlog);

    const response = {
      blog: serializedBlogs,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
      },
    };

    redisClient.setEx(key, 1800, JSON.stringify(response)); // store cache data for 30 minutes.

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error Fetching Blog", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Detail Blog
blogRouter.get("/detail/:id", isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;

    const detailBlog = await Blog.findByPk(id, {
      include: [
        { model: User, as: "author" },
        { model: Tag, through: BlogTag, as: "tags" },
      ],
    });

    if (!detailBlog) {
      return res.status(404).json({ error: "Blog Not Found" });
    }

    const serializedBlogDetail = await serializeBlogDetail(detailBlog);

    const response = {
      detail: serializedBlogDetail,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error Fetching Blog:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Create Blog
blogRouter.post("/post", workerAccess, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const authorId = req.session.user.id;
    const author = await User.findByPk(authorId);

    if (!author) {
      return res.status(404).json({ error: "Author not found" });
    }

    const newBlog = await Blog.create({
      title,
      content,
      authorId,
      like: 0,
      dislike: 0,
    });

    const tagInstances = await Tag.findAll({ where: { name: tags } });
    const blogInstance = await newBlog.addTags(tagInstances);

    const newBlogData = serializeBlog(newBlog, author.username);

    const key = "/blog/list";
    const existingCache = await redisClient.get(key);

    let existingData;
    if (existingCache) {
      existingData = JSON.parse(existingCache);
    }

    existingData.blog.push(newBlogData);

    redisClient.setEx(key, 1800, JSON.stringify(existingData));

    return res.status(201).json(blogInstance);
  } catch (error) {
    console.error("Error Adding Blog:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Edit Blog
blogRouter.patch("/edit/:id", workerAccess, async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const id = req.params.id;
    const authorId = req.session.user.id;

    const blogs = await Blog.findByPk(id);
    if (!blogs) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (authorId !== blogs.authorId && req.session.user.role !== "moderator") {
      return res.status(403).json({
        error: "Only the author of this blog or a moderator can edit",
      });
    }

    // Update the blog details
    const [numUpdated, updatedBlogs] = await Blog.update(
      {
        title,
        content,
      },
      {
        where: { id },
        returning: true,
      }
    );

    if (numUpdated === 0) {
      return res.status(404).json({
        error: "Blog not found",
      });
    }

    const updatedBlog = updatedBlogs[0];

    // Check if tags is defined and is an array before processing
    if (tags && Array.isArray(tags)) {
      const tagInstances = await Promise.all(
        tags.map(async (tagName) => {
          const [tag, created] = await Tag.findOrCreate({
            where: { name: tagName },
          });
          return tag;
        })
      );
      // Associate the updated blog with the new tags
      await updatedBlog.setTags(tagInstances);
    }

    // Update the Redis cache for the /blog/list endpoint
    const key = "/blog/list";
    const existingCache = await redisClient.get(key);

    if (existingCache) {
      const parsedCache = JSON.parse(existingCache);
      const updatedIndex = parsedCache.blog.findIndex((blog) => blog.id === id);

      if (updatedIndex !== -1) {
        parsedCache.blog[updatedIndex] = serializeBlog(updatedBlog);
        // Update the cache with the modified data
        await redisClient.setEx(key, 1800, JSON.stringify(parsedCache));
      }
    }

    // Send the updated blog as the JSON response
    return res.status(200).json(updatedBlog);
  } catch (error) {
    console.error("Error Updating Blog:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete Blog
blogRouter.delete("/delete/:id", workerAccess, async (req, res) => {
  try {
    const id = req.params.id;
    const authorId = req.session.user.id;

    const blogs = await Blog.findByPk(id);
    if (!blogs) {
      return res.status(404).json({ error: "Blog not found" });
    }
    if (authorId !== blogs.authorId && req.session.user.role !== "moderator") {
      return res.status(403).json({
        error: "Only the author of this blog or a moderator can delete",
      });
    }

    const deleteBlog = await Blog.destroy({
      where: { id },
      returning: true,
    });

    await BlogTag.destroy({
      where: { blogId: id },
      returning: true,
    });

    await BlogVote.destroy({
      where: { blogId: id },
      returning: true,
    });

    if (deleteBlog > 0) {
      // Update the Redis cache for the /blog/list endpoint
      const key = "/blog/list";
      const existingCache = await redisClient.get(key);

      if (existingCache) {
        const parsedCache = JSON.parse(existingCache);
        const deletedIndex = parsedCache.blog.findIndex(
          (blog) => blog.id === id
        );

        if (deletedIndex !== -1) {
          parsedCache.blog.splice(deletedIndex, 1);
          await redisClient.setEx(key, 1800, JSON.stringify(parsedCache));
        }
      }
      return res.status(200).json({
        message: "Blog and associated Tags deleted successfully",
      });
    } else {
      return res.status(404).json({ error: "No Blog found" });
    }
  } catch (error) {
    console.error("Error Deleting Blog:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Handle Like and Dislike
blogRouter.post("/like/:id", isAuthenticated, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.session.user.id;
    const { voteType = "like" } = req.body;

    const existingVote = await BlogVote.findOne({
      where: { blogId, userId },
    });

    if (existingVote && existingVote.voteType === "like") {
      return res
        .status(400)
        .json({ error: "You have already liked this blog." });
    }

    if (existingVote && existingVote.voteType !== "like") {
      await existingVote.destroy();
      await Blog.decrement("dislike", { where: { id: blogId } });
    }

    // Increment the like count based on user's vote
    const [numUpdated] = await Blog.increment(
      { [voteType]: 1 },
      { where: { id: blogId } }
    );

    if (numUpdated === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Record the user's vote
    await BlogVote.create({ blogId, userId, voteType });

    return res.status(200).json({ message: `Blog ${voteType}d successfully.` });
  } catch (error) {
    console.error(`Blog ${voteType}d failed`, error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

blogRouter.post("/dislike/:id", isAuthenticated, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.session.user.id;
    const { voteType = "dislike" } = req.body;

    const existingVote = await BlogVote.findOne({
      where: { blogId, userId },
    });

    if (existingVote && existingVote.voteType === "dislike") {
      return res
        .status(400)
        .json({ error: "You have already disliked this blog." });
    }

    if (existingVote && existingVote.voteType !== "dislike") {
      await existingVote.destroy();
      await Blog.decrement("like", { where: { id: blogId } });
    }

    // Increment the dislike count based on user's vote
    const [numUpdated] = await Blog.increment(
      { [voteType]: 1 },
      { where: { id: blogId } }
    );

    if (numUpdated === 0) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Record the user's vote
    await BlogVote.create({ blogId, userId, voteType });

    return res.status(200).json({ message: `Blog ${voteType}d successfully.` });
  } catch (error) {
    console.error(`Blog ${voteType}d failed`, error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Reset Like or Dislike
blogRouter.delete("/reset-vote/:id", isAuthenticated, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.session.user.id;

    // Find the user's vote for the specified blog
    const existingVote = await BlogVote.findOne({
      where: { blogId, userId },
    });

    // If the user has voted, delete the vote record
    if (existingVote) {
      await existingVote.destroy();

      // Decrement the like or dislike count in the Blog model
      const voteType = existingVote.voteType;
      if (voteType === "like") {
        await Blog.decrement("like", { where: { id: blogId } });
      } else if (voteType === "dislike") {
        await Blog.decrement("dislike", { where: { id: blogId } });
      }
      return res.status(200).json({ message: "Vote reset successfully." });
    }

    // If the user hasn't voted, return a message
    return res
      .status(404)
      .json({ message: "You haven't voted for this blog." });
  } catch (error) {
    console.error("Error resetting vote:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add Comment
blogRouter.post("/comment/:id", isAuthenticated, async (req, res) => {
  try {
    const blogId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    const { content } = req.body;

    // Check if the blog with the given ID exists
    const blogExists = await Blog.findByPk(blogId);
    if (!blogExists) {
      return res.status(400).json({
        error: "Blog Not Found",
      });
    }

    const newComment = await Comment.create({
      blogId,
      userId,
      content,
    });

    return res.status(201).json(newComment);
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add Reply
blogRouter.post("/reply/:id", isAuthenticated, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    const { content, replyto = null } = req.body;

    const commentExists = await Comment.findByPk(commentId, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });
    if (!commentExists) {
      return res.status(404).json({ error: "Comment Not Found" });
    }

    const replies = await Reply.findAll({
      where: { commentId },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });

    const commentOwner = commentExists.user.username;
    const replySection = replies.map((reply) => reply.user.username);
    const listReplyUser = [commentOwner, ...replySection];

    if (replyto && !listReplyUser.includes(replyto)) {
      return res.status(400).json({
        error: "username not found in the comment",
      });
    }

    const addReply = await Reply.create({
      commentId,
      userId,
      content,
      replyto,
    });

    return res.status(200).json(addReply);
  } catch (error) {
    console.error("Error adding reply:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
// END BLOG REST API
module.exports = blogRouter;
