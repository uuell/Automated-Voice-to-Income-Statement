
import "server-only";
import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-120b";

export const GROQ_TRANSCRIPTION_MODEL =
  process.env.GROQ_TRANSCRIPTION_MODEL ?? "whisper-large-v3";
