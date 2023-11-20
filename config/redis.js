const Redis = require("redis");
const dotenv = require("dotenv");
dotenv.config(); // Load variables from .env file

const redisClient = Redis.createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Check if the connection is successful
redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error(`Redis error: ${err}`);
});

module.exports = redisClient;
