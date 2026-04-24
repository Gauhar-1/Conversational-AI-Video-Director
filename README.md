# 🎬 Director AI: The Future of Cinematic Generation

![Director AI](https://github.com/Gauhar-1/Conversational-AI-Video-Director) <!-- Replace with actual screenshot -->

*Live App:* [https://conversational-ai-video-director.vercel.app/](https://conversational-ai-video-director.vercel.app/) *(Replace with actual URL)*

---

## 🧠 The Architecture: Why this isn't your average wrapper

Let's get one thing straight: I didn't just build another chat interface that blindly forwards your text to a video API. The fundamental problem with modern Generative AI video is the **"Prompt and Pray"** paradigm. It's a black box. You have zero directorial control over character consistency, environment persistency, or temporal pacing. 

To solve this, I engineered a **Decoupled Generative Pipeline mapped onto a Temporal Directed Acyclic Graph (DAG)**. 

### What does that actually mean?
Instead of generating a video from a single prompt, the system breaks down a scene into atomic, controllable components. I built a bespoke **Node-based Temporal Compositing Engine** (leveraging `@xyflow/react` and a highly synchronized React state machine) that visually represents your film's DNA. 

1. **Topological Isolation**: Environments, Characters, and Framing semantics are generated in parallel as isolated topological nodes.
2. **Contextual Stitching**: These assets are then contextually bound and passed as initial states to the video generation node.
3. **Temporal Flow**: Scene 1's output dynamically influences Scene 2's generation context via temporal edge linking. 
4. **Fluid Split-Pane UX**: I built a buttery-smooth, state-driven split-pane interface that seamlessly transitions between conversational ideation and node-based granular tweaking, ensuring maximum screen real estate is optimized at 60fps.
5. **BYOK (Bring Your Own Key) Architecture**: I implemented an entirely client-side credential injection layer. Maximum privacy for the user, zero server-side token bloat for us. 

We aren't just generating videos; we've built a **full-fledged AI Compositing Suite** in the browser. 

---

## 🚀 How to use Director AI to create stunning visuals

Director AI is designed for creators who demand granular control over their AI-generated films. Here is your step-by-step masterclass:

### 1. Initialize the Workspace
Start by navigating to the **Settings (⚙️)** in the top right corner. Director AI operates on a **BYOK (Bring Your Own Key)** model. You must provide your API keys to power the generation engines. 

### 2. The Writer's Room (Chat Interface)
Use the left pane to converse with your AI Director.
- Pitch your core concept, setting, and characters.
- Let the AI break your narrative down into distinct, logical scenes.
- The assistant will automatically populate the right-side **Storyboard Canvas** with your scene nodes.

### 3. The Director's Chair (Storyboard Canvas)
This is where the magic happens. You'll see your scenes mapped out chronologically.
- **Background Node**: Tweak the environment prompt. Is it a *cyberpunk alleyway* or a *neon-lit diner*? Generate the backdrop.
- **Character Nodes**: Lock in your character's look. Director AI maintains global character consistency across scenes. 
- **Frame Node**: Define the cinematography. *Dutch angle? Close up?* Combine your character and background into a perfect starting frame.

### 4. Synthesize & Action
Once your static assets (Background, Character, Frame) are locked in and generated, trigger the **Video Node**. The system composites your assets and prompts the video engine to breathe life into the scene.

### 5. The Director's Cut
Click the **Play (Director's Cut)** button in the HUD. The engine will seamlessly stitch your rendered scenes together and stream them chronologically in a cinematic theater mode. 

Happy with the cut? Hit **Export Content** to download your finalized sequential MP4 files.

---

## 🎒 What You Need to Get Started

To harness the full power of Director AI, you will need the following:

*   **API Keys**: 
    *   **OpenAI API Key** (for Narrative parsing and conversational intelligence)
    *   **Image/Video Gen API Keys** (depending on your configured providers, e.g., Runaway, Luma, Replicate, etc.)
*   **Modern Web Browser**: Chrome, Edge, or Firefox (Desktop recommended for the complex canvas UI).
*   **(For Developers) Node.js 20+**: If you want to run this beast locally.

### Local Installation for Developers

```bash
# 1. Clone the repository
git clone https://github.com/Gauhar-1/Conversational-AI-Video-Director.git

# 2. Install dependencies (We use Next.js 16 + React 19)
npm install

# 3. Setup your Environment Variables
cp .env.example .env.local

# 4. Boot the development server
npm run dev
```

Get ready to direct. 🎬