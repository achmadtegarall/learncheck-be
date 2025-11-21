// assessment-generator/src/prompts/assessmentPrompt.js

const ASSESSMENT_PROMPT_TEMPLATE = `Anda adalah ahli edukasi. Berdasarkan "Konteks Materi" di bawah, buatlah 3 soal pilihan ganda majemuk (multiple answer) untuk formatif asesmen.
Setiap soal harus:
1. Memiliki 4 opsi jawaban.
2. Setiap soal harus memiliki minimal 2 jawaban benar.
3. Berikan 'pre_hint' (petunjuk sebelum menjawab) dan 'feedback' (penjelasan setelah menjawab) untuk setiap soal.

Konteks Materi: "{context_text}"

Hanya kembalikan output dalam format JSON valid berikut. Jangan sertakan teks lain di luar JSON.
{
"questions": [
{
"id": "q1",
"text": "...",
"pre_hint": "...",
"feedback": "...",
"options": [
{"id": "a", "text": "...", "is_correct": true, "feedback": "..."} // <-- Pastikan ada feedback di opsi
// ... 3 opsi lainnya
]
}
// ... soal q2 dan q3
]
}
`;

// Fungsi sekarang DESTRUCTURES parameter
exports.createAssessmentPrompt = ({ context_text }) => {
    // Pastikan template string bersih dari indentasi tab
    let prompt = ASSESSMENT_PROMPT_TEMPLATE.replace("{context_text}", context_text);
    return prompt;
};