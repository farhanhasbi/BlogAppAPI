const { Comment, User, Reply } = require("../config/db-config.js");
const moment = require("moment");

const serializeBlog = (blog) => {
  return {
    id: blog.id,
    title: blog.title,
    author: blog.author.username,
    publish_date: blog.createdAt,
  };
};

const serializeBlogDetail = async (blog) => {
  const [listComment, serializedTags] = await Promise.all([
    Comment.findAll({
      where: { blogId: blog.id },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    }),
    Promise.all(blog.tags.map((tag) => tag.name)),
  ]);

  const serializedComment = await Promise.all(
    listComment.map(async (comment) => {
      const replies = await Reply.findAll({
        where: { commentId: comment.id },
        include: [
          {
            model: User,
            as: "user",
          },
        ],
      });

      return serializeComment(comment, replies);
    })
  );

  return {
    id: blog.id,
    title: blog.title,
    content: blog.content,
    author: blog.author.username,
    like: blog.like,
    dislike: blog.dislike,
    publish_date: moment(blog.createdAt).format("MMMM DD, YYYY HH:mm:ss"),
    tags: serializedTags,
    comment: serializedComment,
  };
};

const serializeComment = (comment, replies) => {
  return {
    id: comment.id,
    user: comment.user.username,
    comment: comment.content,
    replies: replies.map((reply) => ({
      id: reply.id,
      user: reply.user.username,
      comment: reply.content,
      replyto: reply.replyto,
    })),
  };
};

module.exports = { serializeBlog, serializeBlogDetail, serializeComment };
