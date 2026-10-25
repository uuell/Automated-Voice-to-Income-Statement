
import { NextRequest, NextResponse } from "next/server";

import {
  groq,
  GROQ_TRANSCRIPTION_MODEL,
} from "@/lib/groq";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide an audio file.",
        },
        { status: 400 }
      );
    }


    const allowedTypes = [
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/flac",
    "audio/mpga",
    "audio/m4a",
    ];

    const allowedExtensions = [
    "webm",
    "mp4",
    "mp3",
    "wav",
    "ogg",
    "flac",
    "m4a",
    "mpeg",
    "mpga",
    ];

    const extension = audio.name.split(".").pop()?.toLowerCase();

    if (
    !allowedTypes.includes(audio.type) &&
    !allowedExtensions.includes(extension ?? "")
    ) {
    return NextResponse.json(
        {
        success: false,
        message: "Unsupported file type. Please upload an audio file.",
        },
        { status: 400 }
    );
    }

    if (audio.size === 0) {
    return NextResponse.json(
        {
        success: false,
        message: "The audio file is empty.",
        },
        { status: 400 }
    );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
    return NextResponse.json(
        {
        success: false,
        message: "Audio must be smaller than 25 MB.",
        },
        { status: 400 }
    );
    }

    const transcription =
      await groq.audio.transcriptions.create({
        file: audio,
        model: GROQ_TRANSCRIPTION_MODEL,
        response_format: "json",
        prompt:
          "This is a daily financial recap for a vehicle dealership in the Philippines. The speaker may use English, Filipino, or Taglish. Preserve monetary amounts, vehicle names, corrections, and financial terms accurately.",
      });

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Audio transcription failed.",
      },
      { status: 500 }
    );
  }
}
