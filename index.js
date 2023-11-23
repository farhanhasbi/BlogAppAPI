// index
const express = require("express");
const app = express();
const port = process.env.PORT || 5001;
const session = require("express-session");
const cors = require("cors");
const { sequelize } = require("./config/db-config.js");
const passport = require("./config/passport.js");
const authRouter = require("./router/auth.js");
const blogRouter = require("./router/blog.js");
const tagRouter = require("./router/tag.js");
const redisClient = require("./config/redis.js");
const RedisStore = require("connect-redis").default;

app.use(cors());

let redisStore = new RedisStore({
  client: redisClient,
  ttl: 86400,
  prefix: "user-session",
});

// Session and Passport Middleware
app.use(
  session({
    store: redisStore,
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Middleware to parse JSON requests
app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());

// Sync the database
sequelize.sync();

app.use("/auth", authRouter);
app.use("/blog", blogRouter);
app.use("/tag", tagRouter);

app.listen(port, () => {
  console.log(`Port is listening on ${port}`);
  redisClient.connect();
});
