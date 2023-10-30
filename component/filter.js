const { Op } = require("sequelize");

const searchUserName = (whereCondition, username) => {
  if (username) {
    whereCondition.username = {
      [Op.iLike]: `%${username}%`,
    };
  }
};

const searchTagName = (whereCondition, name) => {
  if (name) {
    whereCondition.name = {
      [Op.iLike]: `%${name}%`,
    };
  }
};

const searchTitleBlog = (whereCondition, title) => {
  if (title) {
    whereCondition.title = {
      [Op.iLike]: `%${title}%`,
    };
  }
};

module.exports = {
  searchUserName,
  searchTagName,
  searchTitleBlog,
};
