const checkCache = async (req, res, next) => {
  try {
    const key = req.originalUrl;

    // Attempt to retrieve data from Redis
    const value = await redisClient.get(key);

    if (value) {
      // Cache hit
      const results = JSON.parse(value);
      return res.send(results);
    } else {
      // Cache miss
      next();
    }
  } catch (error) {
    // Handle Redis-related errors
    console.error("Error in checkCache middleware:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = checkCache;
