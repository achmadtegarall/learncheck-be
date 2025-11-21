// assessment-generator/src/controllers/generator.controller.js

const axios = require('axios');
require("dotenv").config();

const { createAssessmentPrompt } = require('../prompts/assessmentPrompt');
const { createQuiz } = require('../utils/quiz.utils');
const { generateQuizContent } = require('../services/llm.service');

// =====================================================
// BASE URL MOCK DICODING API
// =====================================================
const MOCK_DICODING_API_BASE_URL =
    process.env.MOCK_DICODING_API_BASE_URL ||
    'https://learncheck-dicoding-mock-666748076441.europe-west1.run.app/api';


/**
 * ======================================================
 * =============== FETCH TUTORIAL CONTENT ===============
 * ======================================================
 */
const fetchTutorialContent = async (tutorialId) => {
    const MOCK_CONTENT_URL = `${MOCK_DICODING_API_BASE_URL}/tutorials/${tutorialId}`;

    try {
        console.log(`[BE] Fetching tutorial content: ${MOCK_CONTENT_URL}`);

        const response = await axios.get(MOCK_CONTENT_URL);

        if (
            response.status === 200 &&
            response.data &&
            response.data.data &&
            response.data.data.content
        ) {
            const rawHTML = response.data.data.content;

            const cleanText = rawHTML.replace(/<[^>]+>/g, "").trim();
            const limitedText = cleanText.slice(0, 4000);

            console.log(`[BE] Content fetched. Length: ${limitedText.length}`);
            return limitedText;
        }

        console.warn(`[BE] Konten kosong. Fallback dummy digunakan.`);
        return "Konten dummy: Materi tentang AI, Natural Language Processing, dan Self-driving Car.";

    } catch (err) {
        console.error(`[BE] Error fetch konten:`, err.message);
        console.warn(`[BE] Menggunakan fallback dummy.`);
        return "Konten dummy: Materi tentang AI, Natural Language Processing, dan Self-driving Car.";
    }
};



/**
 * ======================================================
 * ========== FETCH USER PREFERENCES (LIVE API) =========
 * ======================================================
 */
const fetchUserPreferences = async (userId) => {
    const url = `${MOCK_DICODING_API_BASE_URL}/users/${userId}/preferences`;

    try {
        console.log(`[BE] Fetching user preferences: ${url}`);

        const response = await axios.get(url);

        if (
            response.status === 200 &&
            response.data &&
            response.data.data &&
            response.data.data.preference
        ) {
            return response.data.data.preference;
        }

        console.warn(`[BE] Preferences kosong. Default digunakan.`);
        return { theme: 'light', locale: 'id' };

    } catch (err) {
        console.error(`[BE] Error fetch preferences:`, err.message);
        return { theme: 'light', locale: 'id' };
    }
};



/**
 * ======================================================
 * =============== GENERATE ASSESSMENT ==================
 * ======================================================
 */
const generateAssessment = async (req, res) => {
    const { tutorial_id, user_id } = req.body;

    if (!tutorial_id || !user_id) {
        return res.status(400).json({
            status: 'error',
            message: 'tutorial_id dan user_id wajib diisi.'
        });
    }

    try {
        const contextText = await fetchTutorialContent(tutorial_id);
        const userPreferences = await fetchUserPreferences(user_id);

        const prompt = createAssessmentPrompt({ context_text: contextText });

        const llmRawOutput = await generateQuizContent(prompt);
        console.log(`[LOG] LLM Output (first 200): ${llmRawOutput.slice(0, 200)}...`);

        let parsedOutput;

        try {
            const jsonMatch = llmRawOutput.match(/\{[\s\S]*\}/);
            parsedOutput = JSON.parse((jsonMatch ? jsonMatch[0] : llmRawOutput).trim());
        } catch (parseErr) {
            console.error(`Parsing JSON gagal:`, parseErr.message);
            throw new Error(`Format output LLM tidak valid.`);
        }

        if (!parsedOutput.questions || !Array.isArray(parsedOutput.questions)) {
            throw new Error("'questions' tidak ditemukan pada output LLM.");
        }

        const formattedQuestions = createQuiz(parsedOutput.questions);

        res.json({
            status: 'success',
            questions: formattedQuestions,
            userPreferences,
            metadata: { tutorialId: tutorial_id, userId: user_id }
        });

    } catch (err) {
        console.error(`[CRITICAL ERROR] ${err.message}`);

        res.status(500).json({
            status: 'error',
            message: 'Gagal menghasilkan asesmen.'
        });
    }
};



/**
 * ======================================================
 * ===================== SUBMIT QUIZ ====================
 * ======================================================
 */
const assessmentHistory = [];

const submitAssessment = async (req, res) => {
    const { userId, tutorialId, answers, questions } = req.body;

    if (!userId || !tutorialId || !answers || !questions) {
        return res.status(400).json({
            status: 'error',
            message: 'Data submission tidak lengkap.'
        });
    }

    try {
        const mockScore = Math.floor(Math.random() * 10) * 10;

        const newRecord = {
            id: `hist-${Date.now()}`,
            userId,
            tutorialId,
            date: new Date().toISOString(),
            score: mockScore,
            totalQuestions: questions.length,
        };

        assessmentHistory.push(newRecord);

        return res.json({
            status: 'success',
            message: 'Asesmen berhasil disubmit.',
            score: mockScore
        });

    } catch (err) {
        console.error("[ERROR] Submit:", err.message);

        return res.status(500).json({
            status: 'error',
            message: 'Gagal memproses submit.'
        });
    }
};



/**
 * ======================================================
 * ================== GET HISTORY QUIZ ==================
 * ======================================================
 */
const getAssessmentHistory = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({
            status: 'error',
            message: 'User ID dibutuhkan.'
        });
    }

    const history = assessmentHistory.filter(r => r.userId === userId);

    return res.json({
        status: 'success',
        data: history,
        message: 'Riwayat berhasil diambil.'
    });
};



/**
 * ======================================================
 * =========== GET USER PREFERENCES (LIVE API) ==========
 * ======================================================
 */
const getUserPreferences = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({
            status: 'error',
            message: 'User ID dibutuhkan.'
        });
    }

    const url = `${MOCK_DICODING_API_BASE_URL}/users/${userId}/preferences`;

    try {
        const response = await axios.get(url);

        if (
            response.status === 200 &&
            response.data &&
            response.data.data &&
            response.data.data.preference
        ) {
            return res.json({
                status: 'success',
                data: response.data.data.preference,
                message: 'Preferensi pengguna berhasil diambil.'
            });
        }

        return res.json({
            status: 'success',
            data: {},
            message: 'Preferensi tidak ditemukan.'
        });

    } catch (err) {
        console.error("[ERROR] getUserPreferences:", err.message);

        return res.status(500).json({
            status: 'error',
            message: 'Gagal memfetch preferensi.'
        });
    }
};



/**
 * ======================================================
 * ===================== EXPORTS ========================
 * ======================================================
 */
module.exports = {
    generateAssessment,
    submitAssessment,
    getAssessmentHistory,
    getUserPreferences
};
