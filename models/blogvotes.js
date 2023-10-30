'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class BlogVotes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  BlogVotes.init({
    blogId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    voteType: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'BlogVotes',
  });
  return BlogVotes;
};