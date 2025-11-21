// src/controllers/hint.controller.js

require("dotenv").config();
const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");

const { getCache, setCache, getCacheKey } = require("../utils/cache.utils");
const { createHintPrompt } = require("../prompts/hintPrompt");

// =====================================================
// ENV & KONFIG
// =====================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn(
    "[HINT] GEMINI_API_KEY belum di-set. Set dulu di file .env agar LLM jalan."
  );
}

const MOCK_DICODING_API_BASE_URL =
  process.env.MOCK_DICODING_API_BASE_URL ||
  "https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY || "",
});

// Model fallback list
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-pro",
];

// =====================================================
// HELPER: timeout wrapper
// =====================================================
const withTimeout = (promise, ms = 20000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LLM request timeout")), ms)
    ),
  ]);

// =====================================================
// HELPER: bersihkan konten HTML dari mock Dicoding
// =====================================================
const cleanContent = (raw) => {
  if (!raw) return "";
  let text = String(raw);

  // hapus tag HTML
  text = text.replace(/<\/?[^>]+(>|$)/g, " ");

  // ganti banyak spasi / newline
  text = text.replace(/\s+/g, " ").trim();

  // batasi panjang konteks (biar prompt nggak kepanjangan)
  const MAX_LEN = 4000;
  if (text.length > MAX_LEN) {
    text = text.slice(0, MAX_LEN) + " ...";
  }

  return text;
};

// =====================================================
// HELPER: Ambil konten tutorial berdasarkan tutorialId
// =====================================================
const fetchTutorialContent = async (tutorialId) => {
  const url = `${MOCK_DICODING_API_BASE_URL}/tutorials/${tutorialId}`;

  console.log("[HINT] Fetching tutorial content:", url);

  const response = await axios.get(url);

  if (
    response.status === 200 &&
    response.data &&
    response.data.data &&
    response.data.data.content
  ) {
    const rawContent = response.data.data.content;
    return cleanContent(rawContent);
  }

  throw new Error("Tidak ada konten tutorial dari Mock Dicoding.");
};

// =====================================================
// HELPER: ambil JSON murni dari balasan LLM
// =====================================================
const extractPureJSON = (text) => {
  if (!text) throw new Error("LLM tidak mengembalikan teks.");

  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Format JSON dari LLM tidak valid.");
  }

  const jsonString = text.slice(startIndex, endIndex + 1);
  return JSON.parse(jsonString);
};

// =====================================================
// HELPER: panggil Gemini dengan fallback beberapa model
// =====================================================
const callGeminiWithFallback = async (prompt) => {
  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log("[HINT] Call Gemini model:", modelName);

      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.5,
          },
        }),
        20000
      );

      // @google/genai -> response.text adalah STRING, bukan function
      const rawText = (response.text || "").trim();
      console.log("[HINT] Raw LLM response:", rawText);

      const parsed = extractPureJSON(rawText);
      return parsed;
    } catch (err) {
      console.error(
        `[HINT] Model ${modelName} gagal:`,
        err?.message || err
      );
      lastError = err;
      // coba model berikutnya
    }
  }

  // kalau semua model gagal
  throw (
    lastError ||
    new Error("Semua model Gemini gagal dipanggil pada MODEL_CHAIN.")
  );
};

// =====================================================
// CORE LOGIC: generateHintFromLLM
// =====================================================
const generateHintFromLLM = async ({ tutorialId, question }) => {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY belum tersedia.");
  }

  // Cek cache dulu
  const cacheKey = getCacheKey(tutorialId, question);
  const cached = await getCache(cacheKey);
  if (cached && cached.hint) {
    console.log("[HINT] Cache HIT:", cacheKey);
    return cached;
  }

  console.log("[HINT] Cache MISS, panggil LLM:", cacheKey);

  // 1. Ambil konteks dari Mock Dicoding
  const contextText = await fetchTutorialContent(tutorialId);

  // 2. Buat prompt untuk LLM
  const prompt = createHintPrompt({
    question,
    context_text: contextText,
  });

  // 3. Panggil LLM dengan fallback beberapa model
  const parsed = await callGeminiWithFallback(prompt);

  if (!parsed.hint || typeof parsed.hint !== "string") {
    throw new Error('JSON dari LLM tidak memiliki field "hint"');
  }

  // 4. Simpan ke cache (TTL 1 jam)
  await setCache(cacheKey, parsed, 3600);

  return parsed;
};

// =====================================================
// CONTROLLER: endpoint /hint/generate
// =====================================================
exports.getHint = async (req, res) => {
  try {
    const { tutorial_id, question } = req.body || {};

    if (!tutorial_id || !question) {
      return res.status(400).json({
        status: "fail",
        message: "tutorial_id dan question wajib diisi.",
      });
    }

    const hintResult = await generateHintFromLLM({
      tutorialId: tutorial_id,
      question,
    });

    return res.status(200).json({
      status: "success",
      data: hintResult,
    });
  } catch (error) {
    console.error("[HINT] Error getHint:", error.message);

    return res.status(500).json({
      status: "error",
      message: "Gagal menghasilkan hint.",
      details: error.message,
    });
  }
};
