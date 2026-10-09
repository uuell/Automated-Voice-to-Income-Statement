
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { groq, GROQ_CHAT_MODEL } from "@/lib/groq";
import { EXTRACTION_SYSTEM_PROMPT } from "@/lib/accounting/extraction-prompt";
import { extractionResultSchema } from "@/lib/validations/extraction";

const requestSchema = z.object({
  transcript: z.string().trim().min(5).max(20000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedRequest = requestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid transcript",
          errors: parsedRequest.error.flatten(),
        },
        { status: 400 }
      );
    }

    const response = await groq.chat.completions.create({
      model: GROQ_CHAT_MODEL,
      messages: [
        {
          role: "system",
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: parsedRequest.data.transcript,
        },
      ],
      temperature: 0,
      max_completion_tokens: 3000,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "AI returned an empty response",
        },
        { status: 502 }
      );
    }

    const rawResult = JSON.parse(content);
    const validatedResult =
      extractionResultSchema.safeParse(rawResult);

    if (!validatedResult.success) {
      console.error(
        "Invalid AI extraction:",
        validatedResult.error.flatten()
      );

      return NextResponse.json(
        {
          success: false,
          message: "AI returned an invalid transaction structure",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: validatedResult.data,
    });
  } catch (error) {
    console.error("Transaction extraction failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to extract transactions",
      },
      { status: 500 }
    );
  }
}
