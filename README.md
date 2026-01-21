# Meeting Summarizer 🎙️📝

## Objective
The primary goal of the **Meeting Summarizer** is to automate the process of converting meeting audio files into **action-oriented summaries** that highlight key decisions and actionable tasks.

---

## Features & Scope of Work
This project is designed to ingest meeting audio, process it, and output structured text data.

**Input**: Meeting audio files.
**Output**: Text transcript, a summary, and extracted action items.
**Optional Frontend**: An optional user interface (frontend) is included to allow users to easily upload audio files and view the generated summary.

---

## Technical Expectations

### Core Technologies
The system integrates various technologies to handle transcription and summarization:

**ASR API Integration**: Utilizes an Automated Speech Recognition (ASR) API (e.g., Google, Azure, OpenAI Whisper) to convert audio input into a text transcript.
**LLM for Summary Generation**: A Large Language Model (LLM) is employed to process the transcript and generate the structured summary.
*Prompt Guidance*: The LLM is guided to summarize the transcript, highlight key decisions, and generate tasks.A prompt example is: "Summarize this meeting transcript into key decisions and action items".
**Backend**: A backend is required to store and process the data.

### Directory Structure & Development Stack
The project uses a modern web development stack, evident from the included configuration and source files:

| File/Directory | Purpose |
| :--- | :--- |
| **`src/`** | Contains the main application source code. |
| **`supabase/`** | Likely configuration/code for a **Supabase** integration (used for backend/database needs). |
| **`vite.config.ts`**, **`index.html`** | Files indicating a **Vite**-based modern frontend setup. |
| **`tailwind.config.js`**, **`postcss.config.js`** | Configuration for **Tailwind CSS** and **PostCSS** (used for styling the optional frontend). |
| **`tsconfig.json`** files | Configuration files for **TypeScript**. |
| **`package.json`** files | Defines project dependencies (packages) for Node.js/JavaScript. |
| **`.gitignore`**, **`eslint.config.js`** | Standard files for code management and linting. |

---

## Deliverables
The successful completion of this project includes:

1.  This **GitHub Repository** and comprehensive `README.md` file.
2.  A **Demo Video**.

---

## Evaluation Focus
The system will be evaluated based on the following key metrics:

* **Transcription Accuracy**
* **Summary Quality**
* **LLM Prompt Effectiveness**
* **Code Structure**

---

## Deployment Configuration

### Required Environment Variables

To deploy and run the Meeting Summarizer, you need to configure the following environment variables in your Supabase Edge Functions:

#### Required Secrets:
- **`OPENAI_API_KEY`**: Your OpenAI API key for accessing transcription (Whisper) and summarization (GPT-4o-mini) services
- **`SUPABASE_URL`**: Your Supabase project URL
- **`SUPABASE_SERVICE_ROLE_KEY`**: Your Supabase service role key with admin privileges

#### Optional Environment Variables:
- **`TRANSCRIPTION_MODEL`**: The OpenAI transcription model to use (default: `whisper-1`)
- **`TRANSCRIPTION_LANGUAGE`**: The language code for transcription (default: `en`). See [OpenAI's language support](https://platform.openai.com/docs/guides/speech-to-text) for available options.

### Setting Secrets in Supabase

Use the Supabase CLI to set your environment secrets:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Set required secrets
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
supabase secrets set SUPABASE_URL=your_supabase_url_here
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Set custom transcription model (if different from whisper-1)
supabase secrets set TRANSCRIPTION_MODEL=whisper-1

# Optional: Set transcription language (if different from English)
supabase secrets set TRANSCRIPTION_LANGUAGE=en
```

### Deploying the Edge Function

After setting the secrets, deploy the process-meeting function:

```bash
# Deploy the function
supabase functions deploy process-meeting

# Verify deployment
supabase functions list
```

### Testing the Deployment

You can test the deployed function using curl:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/process-meeting \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"meetingId": "test-meeting-id", "audioUrl": "path/to/audio.mp3"}'
```

---
