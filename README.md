# 🎬 Director AI. (Conversational Video Director)

Director AI is an avant-garde, AI-powered music video and cinematic sequence director. It provides a multimodal workspace where users can chat with a visionary AI director, upload reference images for aesthetic extraction, and automatically generate structured storyboards. 

It features a complete pipeline to generate concept art and high-fidelity video clips for every scene, all wrapped in a highly secure, **Zero-Liability BYOK (Bring Your Own Key)** architecture.

---

## ✨ Key Features

### 🧠 1. The Director Engine (AI Chat & Vision)
* **Avant-Garde AI Persona:** An AI assistant specifically prompted to act like a visionary film director (think Christopher Nolan or A24 Films), enforcing PG-13 safety rules while keeping action intense.
* **Sliding Window Context:** Optimizes token usage by only sending the last 6 valid messages to the AI, preventing token bloat and API crashes.
* **Vision Metadata Extraction:** Users can upload a reference image. The app uses an advanced vision model (`meta/llama-3.2-90b-vision-instruct`) to instantly extract a JSON object of the lighting, vibe, colors, and major subjects.
* **Dual-Model Routing:** Uses heavy, expensive vision models *only* for the split-second image extraction, and switches back to blazing-fast, cheap text models for the ongoing conversation.

### 🎥 2. Storyboard & Media Generation
* **Automated JSON Storyboarding:** The AI converts the finalized chat concept into a structured JSON array of scenes (Scene Number, Timestamp, Location, Action, Camera Movement).
* **Concept Art Generation:** Integrated with **Hugging Face** to generate cinematic reference images (e.g., FLUX.1) for each scene based on the AI's prompts.
* **Cinematic Video Animation:** Integrated with **SiliconFlow** (Wan-AI/Kling) to animate the concept art into 4K cinematic video clips. Includes an automated background polling system to check video status every 5 seconds.
* **Permanent Cloud Storage:** Server-side integration with **Cloudinary** automatically uploads and hosts generated images and videos, saving permanent URLs to the MongoDB database.

### 🛡️ 3. "Zero-Liability" BYOK Architecture
* **Client-Side Key Storage:** API keys for NVIDIA, Hugging Face, and SiliconFlow are stored strictly in the user's browser `localStorage`.
* **Zero Database Risk:** User API keys never touch the backend database, completely eliminating financial liability if the database is ever compromised.
* **Dynamic Client Instantiation:** The Next.js backend dynamically spins up AI SDK clients per-request using transient HTTP headers, ensuring complete tenant isolation.

### 🎨 4. Advanced UI / UX
* **Glassmorphic Settings Modal:** A centralized, categorized UI for users to input their own API keys and select their preferred models across the three pipeline stages (Chat, Image, Video).
* **Dynamic Workspace:** Toggles between Split View, Chat-Only, and Storyboard-Only modes to maximize focus.
* **Interactive Canvas Nodes:** * Cinematic glowing states (Purple for Image Generating, Teal for Video Generating).
  * Hover-to-play mechanics for generated video clips.
* **Inspector Side Drawer:** A sliding right-hand panel that elegantly displays final videos, original image references, and scene metadata.
* **Granular Error Overlays:** Instead of crashing the app, API errors (like `401 Invalid Key`, `429 Rate Limit`, or Out of Credits) are caught and displayed directly on the specific scene node via a sleek red overlay.
* **Optimistic UI Updates:** Chat messages render instantly on the screen before the database confirms the save, eliminating visual latency.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide React (Icons)
* **Backend:** Next.js Route Handlers (API)
* **Database:** MongoDB & Mongoose
* **Media Storage:** Cloudinary (Server-side)
* **AI Providers (BYOK):**
    * **NVIDIA NIM:** Llama 3.1 (Reasoning/Chat) & Llama 3.2 90B Vision (Image Extraction)
    * **Hugging Face:** FLUX.1 Schnell / Stable Diffusion XL (Image Generation)
    * **SiliconFlow (.cn):** Wan-AI / Kling (Cinematic Video Generation)

---

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/Conversational-AI-Video-Director.git](https://github.com/yourusername/Conversational-AI-Video-Director.git)
cd Conversational-AI-Video-Director