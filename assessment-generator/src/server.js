// assessment-generator/src/server.js

const express = require("express");
const cors = require("cors");

// Import semua controller yang diperlukan
const { 
    generateAssessment, 
    submitAssessment, 
    getAssessmentHistory,
    getUserPreferences          // <-- fungsi baru
} = require('./controllers/generator.controller');

// Jika ada service hint terpisah, bisa diaktifkan nanti:
// const { getHint } = require('./controllers/hint.controller'); 

const app = express();
const PORT = 3001; // Pastikan port ini benar

app.use(cors());
app.use(express.json()); // Untuk parsing JSON

// =======================
// ENDPOINT UTAMA KUIS
// =======================
app.post("/quiz/generate", generateAssessment);
app.post("/quiz/submit", submitAssessment);
app.get("/quiz/history/:userId", getAssessmentHistory);

// =======================
// ENDPOINT USER PREFERENCES
// =======================
// GET http://localhost:3001/api/users/<userId>/preferences
app.get("/api/users/:userId/preferences", getUserPreferences);

// =======================
// ENDPOINT LAIN (OPSIONAL)
// =======================
// app.post("/hint/request", getHint);   // Jika hint-service nanti digunakan

// =======================
// START SERVER
// =======================
app.listen(PORT, () =>
    console.log(`Assessment Generator berjalan di http://localhost:${PORT}`)
);
