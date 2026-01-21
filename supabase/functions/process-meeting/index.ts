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
    // Basic method validation
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new Error('Invalid JSON body');
    }

    const { meetingId, audioUrl } = (body ?? {}) as Partial<ProcessMeetingRequest>;
    if (!meetingId || !audioUrl) {
      throw new Error('Missing meetingId or audioUrl');
    }
    requestMeetingId = meetingId;
    await supabase
      .from("meetings")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", meetingId);
    // Supabase Storage download expects the path relative to the bucket
    const storagePath = audioUrl.startsWith('/') ? audioUrl.slice(1) : audioUrl;
    console.log(`Downloading audio from storage path: ${storagePath}`);
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("meeting-audio")
      .download(storagePath);

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

    const transcriptionModel = Deno.env.get("TRANSCRIPTION_MODEL") || "whisper-1"; 
    const transcriptionLanguage = Deno.env.get("TRANSCRIPTION_LANGUAGE") || "en";

    const transcriptionFormData = new FormData();
    transcriptionFormData.append("file", audioFile);
    transcriptionFormData.append("model", transcriptionModel);
    if (transcriptionLanguage) transcriptionFormData.append("language", transcriptionLanguage);
    transcriptionFormData.append("temperature", "0");

    let transcript: string;
    try {
      console.log(`Starting transcription with model: ${transcriptionModel}`);
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
        const errorText = await transcriptionResponse.text();
        console.error(`Transcription failed with model ${transcriptionModel}: ${errorText}`);
        throw new Error(`${transcriptionModel} failed: ${errorText}`);
      }

      const transcriptionResult = await transcriptionResponse.json();
      transcript = transcriptionResult.text;
      console.log(`Transcription successful, transcript length: ${transcript.length}`);
    } catch (_primaryError) {
      console.log(`Primary transcription failed, attempting fallback with whisper-1`);
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
        console.error(`Fallback transcription failed: ${errorText}`);
        throw new Error(`Transcription failed: ${errorText}`);
      }

      const fallbackResult = await fallbackResponse.json();
      transcript = fallbackResult.text;
      console.log(`Fallback transcription successful, transcript length: ${transcript.length}`);
    }
    console.log(`Starting summarization with GPT-4o-mini`);
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
      console.error(`Summarization failed: ${error}`);
      throw new Error(`Summary failed: ${error}`);
    }
    console.log(`Summarization successful`);

    const summaryResult = await summaryResponse.json();
    let analysis: any = {};
    try {
      analysis = JSON.parse(summaryResult.choices?.[0]?.message?.content ?? '{}');
    } catch {
      analysis = {};
    }
    console.log(`Updating meeting ${meetingId} in database with results`);
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
      console.error(`Failed to update meeting in database: ${updateError.message}`);
      throw new Error(`Failed to update meeting: ${updateError.message}`);
    }
    console.log(`Meeting ${meetingId} successfully processed and updated`);

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
        error: error instanceof Error ? error.message : "Unknown error has occurred",
        details: error instanceof Error ? error.stack : undefined,
        meetingId: requestMeetingId,
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
