// src/prompts/hintPrompt.js

const HINT_PROMPT_TEMPLATE = `
Anda adalah asisten pembelajaran yang membantu memberikan petunjuk (hint) singkat berdasarkan konteks materi.

Konteks Materi:
"{context_text}"

Berdasarkan konteks tersebut, berikan petunjuk singkat (maksimal 2 kalimat) untuk membantu siswa menjawab pertanyaan berikut tanpa membocorkan jawaban secara langsung.

Pertanyaan: "{question}"

Kembalikan jawaban dalam format JSON dengan struktur berikut dan JANGAN sertakan teks lain di luar JSON:
{
  "hint": "..."
}
`;

/**
 * Membuat prompt untuk menghasilkan hint.
 * Mengganti placeholder di template dengan data yang sebenarnya.
 */
exports.createHintPrompt = ({ question, context_text }) => {
  let prompt = HINT_PROMPT_TEMPLATE.replace("{question}", question);
  prompt = prompt.replace("{context_text}", context_text);
  return prompt;
};
