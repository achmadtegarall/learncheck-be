// src/utils/cache.utils.js

const Redis = require("ioredis");

// Default ke Memurai / Redis lokal kalau REDIS_URL tidak di-set
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

/**
 * Key cache berdasarkan tutorialId + question
 * Question di-encode base64 biar aman kalau ada karakter aneh.
 */
const getCacheKey = (tutorialId, question) =>
  `hint:${tutorialId}:${Buffer.from(question).toString("base64")}`;

const getCache = async (key) => {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    console.error("[CACHE] Error getCache:", err.message);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 3600) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("[CACHE] Error setCache:", err.message);
  }
};

module.exports = {
  redis,
  getCacheKey,
  getCache,
  setCache,
};
