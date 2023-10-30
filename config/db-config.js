const { Sequelize, DataTypes } = require("sequelize");

// Connect to database
const sequelize = new Sequelize(
  "your_database",
  "your_username",
  "your_password",
  {
    host: "localhost",
    dialect: "postgres",
    logging: false,
  }
);

// Check the database connection
sequelize
  .authenticate()
  .then(() => {
    console.log(
      "Connection to the database has been established successfully."
    );
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

// Define Model
const User = sequelize.define("User", {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("moderator", "author", "user"),
    allowNull: false,
  },
});

const Tag = sequelize.define("Tag", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Blog = sequelize.define("Blog", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  like: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dislike: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const BlogTag = sequelize.define("BlogTag", {
  blogId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tagId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const BlogVote = sequelize.define("BlogVote", {
  blogId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  voteType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Comment = sequelize.define("Comment", {
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  blogId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

const Reply = sequelize.define("Reply", {
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  replyto: {
    type: DataTypes.STRING,
  },
});

// Create a relation between table
Blog.belongsTo(User, { foreignKey: "authorId", as: "author" });
Blog.belongsToMany(Tag, {
  through: "BlogTag",
  as: "tags",
  foreignKey: "blogId",
});
Tag.belongsToMany(Blog, { through: "BlogTag", foreignKey: "tagId" });
BlogVote.belongsTo(Blog, { foreignKey: "blogId", as: "blog" });
BlogVote.belongsTo(User, { foreignKey: "userId", as: "user" });
Comment.belongsTo(Blog, { foreignKey: "blogId", as: "blog" });
Comment.belongsTo(User, { foreignKey: "userId", as: "user" });
Reply.belongsTo(Comment, { foreignKey: "commentId", as: "comment" });
Reply.belongsTo(User, { foreignKey: "userId", as: "user" });

// Export the sequelize instance
module.exports = {
  sequelize,
  User,
  Tag,
  Blog,
  BlogTag,
  BlogVote,
  Comment,
  Reply,
};

// npx sequelize-cli model:generate --name "model-name" --attributes "column_name":"type_data"
// npx sequelize-cli db:migrate
