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
  let requestMeetingId: string | undefined;
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
    requestMeetingId = meetingId;
    await supabase
      .from("meetings")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("meeting-audio")
      .download(audioUrl);

    if (downloadError) {
      throw new Error(`Failed to download audio: ${downloadError.message}`);
    }
    const originalFileName = audioUrl.split("/").pop() ?? "audio";
    const fileExtension = originalFileName.includes('.')
      ? originalFileName.split('.').pop()!.toLowerCase()
      : '';

    const extensionToMime: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/m4a",
      aac: "audio/aac",
      webm: "audio/webm",
      ogg: "audio/ogg",
      flac: "audio/flac",
    };

    const inferredMime = extensionToMime[fileExtension] || audioData.type || "application/octet-stream";
    const audioFile = new File([audioData], originalFileName, { type: inferredMime });

    const transcriptionModel = Deno.env.get("TRANSCRIPTION_MODEL") || "gpt-4o-mini-transcribe"; 
    const transcriptionLanguage = Deno.env.get("TRANSCRIPTION_LANGUAGE") || "en";

    const transcriptionFormData = new FormData();
    transcriptionFormData.append("file", audioFile);
    transcriptionFormData.append("model", transcriptionModel);
    if (transcriptionLanguage) transcriptionFormData.append("language", transcriptionLanguage);
    transcriptionFormData.append("temperature", "0");

    let transcript: string;
    try {
      const transcriptionAbort = new AbortController();
      const transcriptionTimeout = setTimeout(
        () => transcriptionAbort.abort("transcription-timeout"),
        1000 * 60 * 4
      ); 
      const transcriptionResponse = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
          },
          body: transcriptionFormData,
          signal: transcriptionAbort.signal,
        }
      ).finally(() => clearTimeout(transcriptionTimeout));

      if (!transcriptionResponse.ok) {
        throw new Error(`${transcriptionModel} failed: ${await transcriptionResponse.text()}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcript = transcriptionResult.text;
    } catch (_primaryError) {
      const fallbackFormData = new FormData();
      fallbackFormData.append("file", audioFile);
      fallbackFormData.append("model", "whisper-1");
      if (transcriptionLanguage) fallbackFormData.append("language", transcriptionLanguage);
      fallbackFormData.append("temperature", "0");

      const fallbackAbort = new AbortController();
      const fallbackTimeout = setTimeout(
        () => fallbackAbort.abort("transcription-timeout"),
        1000 * 60 * 6
      ); 
      const fallbackResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}` },
        body: fallbackFormData,
        signal: fallbackAbort.signal,
      }).finally(() => clearTimeout(fallbackTimeout));

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        throw new Error(`Transcription failed: ${errorText}`);
      }

      const fallbackResult = await fallbackResponse.json();
      transcript = fallbackResult.text;
    }
    const summaryAbort = new AbortController();
    const summaryTimeout = setTimeout(() => summaryAbort.abort("summary-timeout"), 1000 * 60 * 2); // 2 minutes
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
          max_tokens: 700,
          temperature: 0.3,
        }),
        signal: summaryAbort.signal,
      }
    ).finally(() => clearTimeout(summaryTimeout));

    if (!summaryResponse.ok) {
      const error = await summaryResponse.text();
      throw new Error(`Summary generation failed: ${error}`);
    }

    const summaryResult = await summaryResponse.json();
    const analysis = JSON.parse(summaryResult.choices[0].message.content);
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
    try {
      if (requestMeetingId) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from("meetings")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", requestMeetingId);
      }
    } catch {
    }

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
