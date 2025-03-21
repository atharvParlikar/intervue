import { createClient } from "redis";
import { configDotenv } from "dotenv";

configDotenv();

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

export default redisClient;
