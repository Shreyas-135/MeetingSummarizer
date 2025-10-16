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
[cite_start]The successful completion of this project includes[cite: 16]:

1.  This **GitHub Repository** and comprehensive `README.md` file.
2.  A **Demo Video**.

---

## Evaluation Focus
The system will be evaluated based on the following key metrics:

* **Transcription Accuracy**
* **Summary Quality**
* **LLM Prompt Effectiveness**
* **Code Structure**
