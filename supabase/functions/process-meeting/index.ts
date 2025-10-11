import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessMeetingRequest {
  meetingId: string;
  audioUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meetingId, audioUrl }: ProcessMeetingRequest = await req.json();

    // Update status to processing
    await supabase
      .from("meetings")
      .update({ status: "processing" })
      .eq("id", meetingId);

    // Download audio file from Supabase Storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("meeting-audio")
      .download(audioUrl);

    if (downloadError) {
      throw new Error(`Failed to download audio: ${downloadError.message}`);
    }

    // Convert blob to buffer for OpenAI
    const audioBuffer = await audioData.arrayBuffer();
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    // Step 1: Transcribe audio using OpenAI Whisper
    const transcriptionFormData = new FormData();
    transcriptionFormData.append("file", audioFile);
    transcriptionFormData.append("model", "whisper-1");

    const transcriptionResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: transcriptionFormData,
      }
    );

    if (!transcriptionResponse.ok) {
      const error = await transcriptionResponse.text();
      throw new Error(`Transcription failed: ${error}`);
    }

    const transcriptionResult = await transcriptionResponse.json();
    const transcript = transcriptionResult.text;

    // Step 2: Generate summary and extract action items using GPT
    const summaryResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are an expert meeting analyzer. Analyze the transcript and provide a structured response in JSON format with: summary (concise overview), key_decisions (array of strings), and action_items (array of objects with 'task' and 'assignee' fields, use 'Unassigned' if not specified).",
            },
            {
              role: "user",
              content: `Analyze this meeting transcript and extract key information:\n\n${transcript}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      }
    );

    if (!summaryResponse.ok) {
      const error = await summaryResponse.text();
      throw new Error(`Summary generation failed: ${error}`);
    }

    const summaryResult = await summaryResponse.json();
    const analysis = JSON.parse(summaryResult.choices[0].message.content);

    // Step 3: Update meeting record with results
    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        transcript,
        summary: analysis.summary || "No summary available",
        key_decisions: analysis.key_decisions || [],
        action_items: analysis.action_items || [],
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", meetingId);

    if (updateError) {
      throw new Error(`Failed to update meeting: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        meetingId,
        message: "Meeting processed successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing meeting:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});