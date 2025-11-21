// assessment-generator/src/utils/quiz.utils.js

/**
 * Memformat data kuis mentah dari LLM agar sesuai dengan struktur Front-End.
 * LLM memberikan array of questions, fungsi ini memastikan struktur data final.
 * * @param {Array<Object>} rawQuestions - Array pertanyaan mentah dari respons LLM.
 * @returns {Array<Object>} - Array pertanyaan yang sudah diformat.
 */
const createQuiz = (rawQuestions) => {
    // Implementasikan logika formatting di sini.
    // Untuk saat ini, kita kembalikan saja array mentahnya agar error hilang.
    // Di masa depan, Anda mungkin perlu melakukan validasi dan penambahan ID unik.
    
    if (!Array.isArray(rawQuestions)) {
        console.error("LLM response did not contain a valid array of questions.");
        return [];
    }

    // Contoh: Asumsi format LLM sudah sangat dekat dengan kebutuhan FE
    return rawQuestions.map(q => ({
        id: q.id || `q-${Math.random().toString(36).substring(2, 9)}`, // Pastikan ada ID unik
        question: q.text,
        pre_hint: q.pre_hint,
        feedback: q.feedback,
        options: q.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            is_correct: opt.is_correct,
            hint: opt.hint // Ini adalah feedback per opsi
        }))
    }));
};

module.exports = {
    createQuiz,
};