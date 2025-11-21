require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const Redis = require("ioredis");

// Redis Client
const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// Google AI Client
const ai = new GoogleGenAI({});

// TIMEOUT PROMISE
const withTimeout = (promise, ms) =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("LLM TimeoutExceeded")), ms)
        ),
    ]);

// Extract JSON murni
const extractPureJSON = (raw) => {
    if (!raw) return null;
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
};

// Model fallback list (UPDATED MODEL LIST)
const MODEL_CHAIN = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-pro",
    "gemini-2.0-flash-thinking",
];


const generateQuizContent = async (prompt) => {
    const CACHE_KEY = `quiz:${Buffer.from(prompt).toString("base64")}`;
    const CACHE_TTL = 3600; // 1 hour

    // ==========================================================
    // 1. CEK CACHE REDIS
    // ==========================================================
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
        console.log("[LLM Service] Using Redis Cache.");
        return cached;
    }

    // ==========================================================
    // LOOP MODEL FALLBACK
    // ==========================================================
    for (const modelName of MODEL_CHAIN) {
        console.log(`[LLM Service] Trying model: ${modelName}`);

        let attempt = 0;

        while (attempt < 3) {
            try {
                attempt++;

                console.log(
                    `[LLM Service] Attempt ${attempt}/3 using model ${modelName}...`
                );

                // ============================================
                // KIRIM REQUEST DENGAN TIMEOUT PROTECTION
                // ============================================
                const response = await withTimeout(
                    ai.models.generateContent({
                        model: modelName,
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            temperature: 0.5,
                        },
                    }),
                    12000 // timeout 12 detik
                );

                const raw = response.text?.trim();
                const jsonClean = extractPureJSON(raw);

                if (!jsonClean) throw new Error("Invalid JSON from LLM");

                console.log(
                    `[LLM Service] SUCCESS with ${modelName}, caching result...`
                );

                // SIMPAN KE REDIS
                await redis.set(CACHE_KEY, jsonClean, "EX", CACHE_TTL);

                return jsonClean;
            } catch (error) {
                const errMsg = error.message || "";

                const isRetry =
                    errMsg.includes("503") ||
                    errMsg.includes("UNAVAILABLE") ||
                    errMsg.includes("overloaded") ||
                    errMsg.includes("429") ||
                    errMsg.includes("RESOURCE_EXHAUSTED");

                const isTimeout = errMsg.includes("TimeoutExceeded");

                if (isRetry || isTimeout) {
                    const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                    console.warn(
                        `[LLM Service] Retryable error on ${modelName}. Delay ${delay} ms`
                    );
                    await new Promise((r) => setTimeout(r, delay));
                    continue;
                }

                console.error(
                    `[LLM Service] Non-retryable error on ${modelName}:`,
                    errMsg
                );
                break;
            }
        }

        console.warn(`[LLM Service] Model ${modelName} failed. Trying next...`);
    }

    // Semua gagal → throw final error
    throw new Error("All LLM models failed after retries.");
};

module.exports = { generateQuizContent };
