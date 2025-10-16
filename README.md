# Meeting Summarizer 🎙️📝

## Objective
[cite_start]The primary goal of the **Meeting Summarizer** is to automate the process of converting meeting audio files into **action-oriented summaries** that highlight key decisions and actionable tasks[cite: 3, 14].

---

## Features & Scope of Work
[cite_start]This project is designed to ingest meeting audio, process it, and output structured text data[cite: 6, 7].

* [cite_start]**Input**: Meeting audio files[cite: 6].
* [cite_start]**Output**: Text transcript, a summary, and extracted action items[cite: 7].
* [cite_start]**Optional Frontend**: An optional user interface (frontend) is included to allow users to easily upload audio files and view the generated summary[cite: 8].

---

## Technical Expectations

### Core Technologies
The system integrates various technologies to handle transcription and summarization:

* [cite_start]**ASR API Integration**: Utilizes an Automated Speech Recognition (ASR) API (e.g., Google, Azure, OpenAI Whisper) to convert audio input into a text transcript[cite: 10].
* [cite_start]**LLM for Summary Generation**: A Large Language Model (LLM) is employed to process the transcript and generate the structured summary[cite: 12].
    * [cite_start]*Prompt Guidance*: The LLM is guided to summarize the transcript, highlight key decisions, and generate tasks[cite: 14]. [cite_start]A prompt example is: "Summarize this meeting transcript into key decisions and action items"[cite: 15].
* [cite_start]**Backend**: A backend is required to store and process the data[cite: 11].

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

1.  [cite_start]This **GitHub Repository** and comprehensive `README.md` file[cite: 17].
2.  [cite_start]A **Demo Video**[cite: 18].

---

## Evaluation Focus
[cite_start]The system will be evaluated based on the following key metrics[cite: 19]:

* **Transcription Accuracy**
* **Summary Quality**
* **LLM Prompt Effectiveness**
* **Code Structure**
