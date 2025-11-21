// src/server.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { getHint } = require("./controllers/hint.controller");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "hint-service" });
});

// Endpoint utama hint
app.post("/hint/generate", getHint);

// Jalankan server
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Hint service running on port ${PORT}`);
});
