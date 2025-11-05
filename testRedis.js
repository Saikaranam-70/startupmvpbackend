const redis = require("./config/redis");

(async () => {
  try {
    await redis.set("testKey", "Hello Redis!");
    const value = await redis.get("testKey");
    console.log("Value from Redis:", value);
    process.exit(0);
  } catch (err) {
    console.error("Redis test failed:", err);
    process.exit(1);
  }
})();
