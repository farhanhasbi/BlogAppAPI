// Import Packagew
const passport = require("passport");
const BasicStrategy = require("passport-http").BasicStrategy;
const bcrypt = require("bcrypt");
const { User } = require("./db-config.js");

// Configure the basic strategy for passport
passport.use(
  new BasicStrategy((username, password, done) => {
    // Find the user using Sequelize
    User.findOne({ where: { username } })
      .then((user) => {
        console.log("Auth Success"); // Add this line for debugging

        // Check if the user exists and if the password is correct
        if (!user || !bcrypt.compareSync(password, user.password)) {
          console.log("Invalid credentials"); // Add this line for debugging
          return done(null, false, { message: "Invalid credentials" });
        }

        // If everything is fine, return the user
        return done(null, user);
      })
      .catch((err) => done(err));
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;
