# Director AI: System Architecture & Engineering Protocol

> **Document Version:** 2.0.0  
> **Target Framework:** Next.js 16 (App Router)  
> **Persistence Model:** Polyglot Architecture (Supabase Identity + MongoDB JSON React Flow State)  
> **AI Engines:** Groq (`openai/gpt-oss-20b`), Replicate (FLUX Schnell, Kling 2.5 Turbo Pro, Wan 2.5 i2v, MiniMax 01, Luma Ray)

---

## 1. Executive Summary & Architectural Overview

**Director AI** is an NLE-grade generative video orchestrator that unifies node-based spatial workflows (React Flow) with multi-modal AI generation pipelines. The architecture decouples conversational exploration from video execution through a **State-Decoupled Global Vault** and a **Zero-Token Cache Interceptor**, yielding up to **85% reduction in LLM token consumption** and eliminating redundant provider billing via deterministic idempotency keys.

```
                           +----------------------------------------+
                           |   Client UI / Canvas / React Flow UI   |
                           +-------------------+--------------------+
                                               |
                                     (Session Cookies)
                                               v
                           +----------------------------------------+
                           |  Next.js Edge Middleware & Auth Bridge  |
                           +-------------------+--------------------+
                                               | (x-user-id UUID)
                  +----------------------------+----------------------------+
                  |                                                         |
                  v                                                         v
   +------------------------------+                          +------------------------------+
   |   Supabase Identity Engine   |                          |   Decoupled Service Layer    |
   | (OAuth / SSR Cookie Sessions)|                          |  (ProjectService, TaskService)|
   +------------------------------+                          +--------------+---------------+
                                                                            |
                                            +-------------------------------+-------------------------------+
                                            |                               |                               |
                                            v                               v                               v
                             +------------------------------+ +---------------------------+ +-------------------------------+
                             | MongoDB (Mongoose Multi-Ten) | | Rate Limiter & Idempotency| | Dependency Inverted Factory   |
                             | - Project (Vault + Scenes)   | | - Upstash REST / Memory   | | - IVideoGenerator             |
                             | - VideoTask (Idempotency)    | | - SHA-256 Hash Guard      | | - Replicate / Kling / Wan /   |
                             +------------------------------+ +---------------------------+ |   MiniMax / Luma / Fal        |
                                                                                            +-------------------------------+
```

---

## 2. Polyglot Persistence & Multi-Tenant Data Segregation

### The Supabase-MongoDB Bridge Protocol
The system enforces a strict division of responsibility across data tiers:
1. **Supabase (Identity Tier):** Manages user sessions, OAuth, and magic links via `@supabase/ssr` cookies. Passwords, auth credentials, and session state are **never** stored in MongoDB.
2. **MongoDB (Canvas & Scene Document Tier):** Stores the heavily nested, graph-like React Flow storyboard state and asynchronous video task execution records.

```mermaid
sequenceDiagram
    participant Browser
    participant Middleware as Next.js Middleware
    participant Route as Next.js API Route
    participant Auth as getAuthUser Bridge
    participant Service as ProjectService
    participant MongoDB

    Browser->>Middleware: Request with session cookies
    Middleware->>Middleware: Decode JWT payload / extract sub
    Middleware->>Route: Injects x-user-id header
    Route->>Auth: Extract authenticated userId
    Auth-->>Route: Return { userId: UUID, isAuthenticated: true }
    Route->>Service: getProjectById(userId, projectId)
    Service->>MongoDB: findOne({ _id: projectId, userId })
    MongoDB-->>Service: Project document
    Service-->>Route: Scoped entity
    Route-->>Browser: JSON response
```

### Multi-Tenant Indexing Strategy
Every Mongoose query and mutation is strictly parameterized by `userId`. Compound indexes guarantee $O(\log n)$ performance and cross-tenant data leakage prevention:

```typescript
// Project model compound indexes
ProjectSchema.index({ userId: 1, updatedAt: -1 });
ProjectSchema.index({ userId: 1, _id: 1 });

// VideoTask model compound indexes
VideoTaskSchema.index({ userId: 1, projectId: 1, createdAt: -1 });
VideoTaskSchema.index({ userId: 1, sceneId: 1, status: 1 });
VideoTaskSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
```

---

## 3. SOLID Design Principles & Service Decoupling

| Principle | Implementation in Director AI | Concrete File Reference |
|---|---|---|
| **Single Responsibility (SRP)** | All database operations and domain logic are extracted from Route Handlers and React components into dedicated services. Routes only handle HTTP concerns and validation. | [`src/lib/services/projectService.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/services/projectService.ts)<br>[`src/lib/services/videoTaskService.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/services/videoTaskService.ts) |
| **Open/Closed (OCP)** | Video generation providers conform to an abstract interface. Supporting new providers (Fal.ai, Runway Gen-3) requires adding a new generator class without modifying existing routes or client components. | [`src/lib/generators/types.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/generators/types.ts)<br>[`src/lib/generators/VideoGeneratorFactory.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/generators/VideoGeneratorFactory.ts) |
| **Liskov Substitution (LSP)** | Any class implementing `IVideoGenerator` can seamlessly substitute `ReplicateVideoGenerator` without side effects or breaking contracts. | [`src/lib/generators/ReplicateVideoGenerator.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/generators/ReplicateVideoGenerator.ts) |
| **Interface Segregation (ISP)** | Granular Zod schemas separate project creation, patch updates, camera angle validation, and video generation payloads instead of one monolithic schema. | [`src/lib/validations/project.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/validations/project.ts)<br>[`src/lib/validations/generation.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/validations/generation.ts) |
| **Dependency Inversion (DIP)** | API route handlers depend on the `IVideoGenerator` abstraction instantiated via `VideoGeneratorFactory`, never directly binding to third-party SDK clients. | [`src/app/api/generate-video/route.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/app/api/generate-video/route.ts) |

---

## 4. Critical Scaling Safeguards

### 4.1. Deterministic Idempotency Keys (Double-Billing Prevention)
When dishing out video generations ($0.10–$0.40 per run on Replicate), client retries, double-clicks, or connection hiccups can result in duplicate predictions and double-billing.
- **Algorithm:** Computes a SHA-256 hash across `userId`, `projectId`, `sceneId`, `prompt`, `model`, and canonicalized advanced parameters.
- **Lookup:** Checks `VideoTask` by `idempotencyKey` before calling any external API.
- **Result:** If an in-flight or completed task exists, returns the existing prediction instantly without calling the provider.

### 4.2. Dirty JSON Repair Engine (`jsonRepair.ts`)
LLMs frequently output markdown fences (` ```json `), unquoted object keys (`{ sceneId: "1" }`), trailing commas (`, }`), single quotes (`'key': 'value'`), or unclosed braces when token limits are reached.
The repair engine systematically executes 9 sequential repair passes:
1. Native `JSON.parse` trial.
2. Strip markdown fences and conversational preambles.
3. Isolate the substring between first `{`/`[` and end of string.
4. Normalize single-quoted attributes to valid double quotes.
5. Quote unquoted alphanumeric property keys.
6. Strip trailing commas preceding `}` or `]`.
7. Intermediary parse attempt.
8. Balance open bracket and brace stacks (LIFO closure) for truncated streaming payloads.
9. Final parse with descriptive diagnostic error formatting.

### 4.3. Resilient Multi-Tier Rate Limiting (`rateLimiter.ts`)
Protects against API quota abuse and denial-of-wallet attacks:
- **Primary:** Upstash Redis REST API via atomic `INCR` + `EXPIRE` pipeline. Zero TCP pool exhaustion or socket connection crashes.
- **Fallback:** High-performance sliding-window in-memory Token Bucket with automated 5-minute background garbage collection.
- **Limits:** 30 requests/min for `/api/scenes/[sceneId]/enrich`; 10 requests/min for `/api/generate-video`.

### 4.4. Standalone MongoDB Transaction Fallback (`transaction.ts`)
MongoDB multi-document transactions require replica set oplogs. Standalone local MongoDB instances (common in local developer environments) throw `IllegalOperation`.
- `withMongoTransaction` attempts an atomic session transaction.
- If an environment lacks a replica set, it catches the error and executes gracefully without transactions, ensuring zero developer setup friction.

---

## 5. Token-Saving Delta Engine & Zero-Token Cache

### Global Continuity Vault
Prompts for individual scenes do **not** receive full chat history. Instead, the `Project.globalVault` maintains isolated references:
- **`characterAnchor`:** Description, reference image URL, PuLID seed.
- **`environmentAnchor`:** Atmosphere description, background image URL, lighting profile.
- **`aspectRatio`:** `'9:16'` or `'16:9'`.

### Zero-Token Regex Cache Interceptor
When a user updates only the camera framing (e.g. switching from `CAM_A_CENTER` to `CAM_B_45_CLOSE`) without altering the scene's action delta:
- The system intercepts the request before dispatching to Groq/OpenAI.
- Applies regex substitution to replace `[CAM_*]: <framing>` prefix with the new angle's cinematic specification.
- **Result:** **0 tokens consumed, 0ms LLM latency**, saving ~480 tokens per scene adjustment!

---

## 6. Final Cut Pro XML (FCPXML) Compiler

The compiler ([`src/lib/fcpxml.ts`](file:///e:/Projects/ConversationalAIVideoDirector/src/lib/fcpxml.ts)) exports the entire storyboard into professional NLE timelines:
- **Format:** Final Cut Pro XML v1.9 (`<fcpxml version="1.9">`).
- **Sequence Format:** Vertical 1080x1920 at 24fps (`frameDuration="100/2400s"`).
- **Dynamic Framing Punch-Ins:**
  - `CAM_A_CENTER`: Default framing (`1.0x` scale).
  - `CAM_B_45_CLOSE` & `CAM_C_OTS`: Injects `<adjust-transform scale="1.3 1.3" anchor="0 0"/>` for an automated 30% close-up zoom directly in Apple Final Cut Pro and DaVinci Resolve.

---

## 7. API Route Directory & Specifications

| Endpoint | Method | Security & Protocol | Purpose |
|---|---|---|---|
| `/api/projects` | `GET` | `getAuthUser`, `userId` filter | Fetch minimal project summaries for sidebar rail |
| `/api/projects` | `POST` | `getAuthUser`, `createProjectSchema`, `withMongoTransaction` | Create new project with initialized Global Vault and Scene 1 |
| `/api/projects/[id]` | `GET` | `getAuthUser`, `userId` filter | Fetch full project with scenes and auto-migrate legacy formats |
| `/api/projects/[id]` | `PATCH` | `getAuthUser`, `updateProjectSchema` | Update project title, vault settings, or scenes array |
| `/api/scenes/[sceneId]` | `PATCH` | `getAuthUser`, `ProjectService.updateScene` | Update isolated scene metadata |
| `/api/scenes/[sceneId]/enrich` | `POST` | `getAuthUser`, Rate Limit (30/m), SSE Streaming | Real-time scene prompt expansion using Groq 20B with 0-token cache |
| `/api/generate-video` | `POST` | `getAuthUser`, Rate Limit (10/m), Idempotency Key | Submit video generation to Kling / Wan / MiniMax / Luma |
| `/api/generate-video/status/[taskId]` | `GET` | `getAuthUser`, `VideoTaskService` | Poll generation status, sync completed videoUrl to scene |
| `/api/generate-frame` | `POST` | `getAuthUser`, Replicate FLUX Schnell, Cloudinary CDN | Render high-resolution scene keyframes |
| `/api/chat` | `POST` | `getAuthUser`, Groq 20B, `repairAndParseJson` | Conversational director exploration and initial storyboard generation |

---

## 8. Progressive Disclosure Routing Model & Studio Design System

### 8.1. Progressive Disclosure Architecture (The Workspace Model)
The legacy 3-pane split-screen dashboard is eliminated. Conversational narrative development and spatial node orchestration are strictly decoupled into independent workspaces:

```
[ Unauthenticated ] ---> /login (Supabase OAuth Gate: Google / GitHub)
                              |
                              v
                        /dashboard (Project Portfolio Grid, No Sidebars)
                              |
                     +--------+--------+
                     |                 |
                     v                 v
          /project/[id]/script    /project/[id]/pipeline
            ("Writer's Room")      ("Node Compositor")
            100% Focused Chat      100% React Flow Canvas
            No Canvas Loaded       No Chat UI Loaded
                     |                 ^
                     +--- "Lock Script -+
```

1. **`/login`:** Minimalist, center-aligned Supabase OAuth card on `bg-zinc-950` with Google and GitHub providers and local development sandbox bypass.
2. **`/dashboard`:** Project portfolio grid (`grid-cols-1 md:grid-cols-3 xl:grid-cols-4`). First card is a dashed `border-zinc-700` "Create New Project" trigger; remaining cards display MongoDB user sequences scoped by Supabase UUID. No sidebars.
3. **`/project/[id]/script` ("Writer's Room"):** 100% focused, center-aligned chat interface (`max-w-3xl`) for narrative, scene dialogue, and script crafting. Includes "Lock Script & Proceed to Pipeline" action pushing router to the node canvas.
4. **`/project/[id]/pipeline` ("Node Compositor"):** Full-viewport React Flow canvas loading generated scene macro nodes, frame keyframes, and video generations. The chat interface disappears entirely.

### 8.2. Studio-Grade Monochromatic Design Tokens
*   **Palette:** Purple, indigo, and blue are strictly prohibited. The system enforces:
    *   Backgrounds: `bg-zinc-950`
    *   Panels & Cards: `bg-zinc-900`
    *   Borders: 1px `border-zinc-800`
    *   Primary Text: `text-zinc-100` / `text-white`
    *   Muted Text: `text-zinc-400` / `text-zinc-500`
*   **Borders & Radii:** Sharp 1px `border-zinc-800` on all cards, inputs, and modals. Max `rounded-md` (`6px`).
*   **Action Inversion:** Primary interactive elements utilize high-contrast inversion (`bg-zinc-100 text-zinc-950 hover:bg-white`) rather than saturated colored buttons.

---

## 9. Token Security, Cookie Refresh Rotation & AuthModal Gating

### 9.1. AuthModal Action Interception
When an unauthenticated visitor clicks "Create New Project" on the Dashboard:
1. The action is intercepted and mounts [AuthModal.tsx](file:///e:/Projects/ConversationalAIVideoDirector/src/components/auth/AuthModal.tsx).
2. The user can either Sign In or Create an Account (Email/Password, Google OAuth, GitHub OAuth).
3. Upon successful authentication, access and refresh tokens are stored in HTTP cookies (`sb-access-token`, `sb-refresh-token`).
4. The pending `createProject` mutation executes automatically, smoothly routing the new creator into the Writer's Room script workspace.

### 9.2. Cookie-Based Refresh Token Rotation (Auto-Login Engine)
*   **Access Token (`sb-access-token`):** Short-lived JWT (3600 seconds) checked across Next.js edge middleware and server actions.
*   **Refresh Token (`sb-refresh-token`):** Long-lived opaque token (30 days) stored in cookies (`SameSite=Lax`).
*   **Zero-Disruption Auto-Login:**
    *   When an access token expires, both `middleware.ts` and `createServerClient` automatically invoke Supabase's `/auth/v1/token?grant_type=refresh_token`.
    *   Fresh tokens are written back to response cookies transparently.
    *   The user remains continuously authenticated without unexpected session dropouts or re-login prompts.

### 9.3. Mandatory Token Protection Across All API Endpoints
All API endpoints ([/api/projects](file:///e:/Projects/ConversationalAIVideoDirector/src/app/api/projects/route.ts), [/api/scenes/*](file:///e:/Projects/ConversationalAIVideoDirector/src/app/api/scenes/%5BsceneId%5D/route.ts), [/api/generate-*](file:///e:/Projects/ConversationalAIVideoDirector/src/app/api/generate-video/route.ts), [/api/chat](file:///e:/Projects/ConversationalAIVideoDirector/src/app/api/chat/route.ts)) enforce `requireAuthUser`. Missing, invalid, or expired tokens without a valid refresh token immediately return `401 Unauthorized`.

---

## 10. Node Compositor UX: Dual-View Canvas & Studio Inspector

### 10.1. Dual-View Workspace Modes
To maximize filmmaker control, the React Flow canvas supports two primary visualization modes:
1. **Graph View (Cluster Compositor):**
   - Decomposes each scene into a 4-node connected cluster:
     - `FrameNode`: First frame keyframe preview, conditioning prompt, and FLUX render/upload controls.
     - `CharacterNode`: PuLID #42 character sheet, appearance prompt, reference image upload, and FLUX generation.
     - `BackgroundNode`: Environment preview, atmosphere prompt, and FLUX generation.
     - `VideoNode`: Motion physics prompt, Replicate engine selector (Kling, Wan, MiniMax, Luma), and video playback.
   - Nodes connect with animated smoothstep bezier edges (`Frame -> Video`, `Char -> Video`, `BG -> Video`, `Video -> NextKeyframe`).
2. **Sequence View (Timeline Compositor):**
   - Renders streamlined horizontal macro cards (`SceneMacroNode`) with asset preview strips (First Frame, Character, Environment) and inline delta action controls.

### 10.2. Interactive Studio Inspector
Clicking on ANY node in either view mode immediately launches the slide-out `NodeInspector` drawer, providing comprehensive asset management:
*   **First Frame Keyframe:** Preview, dropzone upload, prompt conditioning, and FLUX generation.
*   **Character Anchor:** Facial geometry preservation via PuLID seed #42, appearance prompt editing, and sheet generation.
*   **Environment Anchor:** Lighting profile and atmosphere prompt editing, background image generation.
*   **Prompt & Framing Physics:** Zero-token camera angle selector (`CAM_A_CENTER`, `CAM_B_45_CLOSE`, `CAM_C_OTS`), Action Intent Delta, 9:16 master image prompt, and 10s motion prompt.
*   **Video Generation:** Multi-model Replicate dispatch (Kling 2.5 Turbo Pro, Wan 2.5, MiniMax Video-01, Luma Ray) with asynchronous task polling.

---

## 11. Guided 4-Stage Progressive Disclosure Architecture & Data Repositories

### 11.1. The 4-Stage Pipeline Model
The pipeline abandons spaghetti node graphs in favor of a clean, linear, 4-stage disclosure workflow:
1. **The Writer's Room (`/project/[id]/script`):** Distraction-free conversational screenplay development with Groq 20B parsing dialogue and action into structured JSON.
2. **The Casting & Scouting Wizard (`/project/[id]/casting`):** E-commerce asset approval grid. Generates static reference images for Characters (FLUX + PuLID seed consistency) and Locations (atmospheric background plates). Approved assets are saved directly to `Project.global_assets`.
3. **The Auto-Wired Timeline (`/project/[id]/pipeline`):** Strict horizontal, non-branching timeline of `SceneMacroNodes`. Characters and Locations are implicitly wired by backend logic and surfaced as avatar badges. Granular prompt variations and multi-take generations are managed via the right-hand `InspectorDrawer`.
4. **The Playback & Export Engine (`/project/[id]/export`):** Docked sequential player for approved takes, direct local file-sync, and Final Cut Pro XML (`.fcpxml`) export.

### 11.2. Isolated Database Repository Tier (`/lib/db/repositories`)
In accordance with SOLID principles (Single Responsibility & Dependency Inversion), all data tier queries are decoupled into dedicated repositories:

| Repository | Interface | Primary Responsibility & Performance Optimization |
|---|---|---|
| `ProjectRepository` | `IProjectRepository` | Aggregate project lifecycle, progressive stage transitions (`updateStage`), and ultra-lean dashboard summary projections (`.select('_id userId title currentStage aspectRatio scenes.sceneId global_assets updatedAt')`). |
| `AssetRepository` | `IAssetRepository` | Isolated Casting & Scouting vault operations on `Project.global_assets` (character generation history, reference image approval, location plates). |
| `SceneRepository` | `ISceneRepository` | High-frequency delta updates (`PATCH /api/scenes/[id]`), timeline reordering, and multi-take variations (`addTake`, `setActiveTake`, `deleteTake`). |

### 11.3. Granular Delta Update Protocol (Bandwidth Optimization)
Scene modifications (e.g., updating camera angles or framing deltas) bypass whole-document saves. The `SceneRepository.updateSceneDelta` executes atomic positional `$set` operations using MongoDB array filters:
```typescript
await Project.findOneAndUpdate(
  { userId, "scenes.sceneId": sceneId },
  { $set: { "scenes.$.cameraAngle": delta.cameraAngle } },
  { new: true, runValidators: true }
);
```
This guarantees minimal network bandwidth, zero race conditions on concurrent scene edits, and deterministic multi-tenant security.

---

## 12. Guided Workflow & Cognitive Load Optimization (UI/UX Specification)

To ensure creators are never overwhelmed by node-graph complexity, the UI enforces strict progressive disclosure and guided guardrails:

### 12.1. Casting & Scouting Wizard: Enriched Prompt Interfaces
*   **Large Inputs with Internal Scrollbars:** All prompt creation and editing areas feature expanded textareas (`min-h-[160px] p-4 text-sm leading-relaxed resize-y bg-zinc-900 border-zinc-700 font-sans custom-scrollbar`) that comfortably accommodate long external prompts.
*   **Groq Prompt Enrichment Action:** An "Enrich Prompt" button with a sparkle icon sits directly below each prompt textarea. When clicked, it calls Groq's high-speed LLM to rewrite basic narrative ideas into richly detailed, photorealistic prompts tailored for FLUX and PuLID face conditioning.

### 12.2. Video Node Inspector: Read-Only Asset Abstraction
*   **Asset Decoupling:** Inside the React Flow timeline, character and location anchors cannot be edited directly. They appear as compact 32px circular avatar pills with clear labels (e.g., "Detective Moreau", "Rainy Alleyway").
*   **Routing Escape Hatch:** A subtle "Edit in Casting Tab" link routes filmmakers back to Stage 2 (`/project/[id]/casting`) if they need to regenerate or alter core reference sheets.

### 12.3. Guided Onboarding: Pre-Flight Checklist & The First Frame Decision
When a user opens an ungenerated Scene node, the Inspector presents an onboarding state rather than empty inputs:
1.  **Production Checklist:** Visual success indicators confirming required inputs are already locked (`[x] LLM Loaded`, `[x] Character Locked`, `[x] Environment Locked`, `[x] Camera Framing Configured`).
2.  **The First Frame Decision:**
    *   *Primary Action (Recommended):* "Generate First Frame" — locks visual composition and likeness before generating temporal motion.
    *   *Secondary Action (Fast):* "Let Model Decide" — skips the keyframe step and dispatches directly to the generative video engine.

### 12.4. Post-Generation UX: Default-Branching Engine
Once a video clip is generated, the Inspector provides two clear, safe paths:
*   **Accept & Move to Next Scene:** Confirms the active take and advances selection to the subsequent timeline node.
*   **Iterate & Branch (Default):** Safely duplicates the scene state as a new Take, preserves prior video takes in version history, and clears the active intent prompt for tweaking.

### 12.5. Real-Time Sequential Playback Engine (JS Playlist Logic)
*   Global video playback overlay streams the entire sequence without requiring cloud rendering or FFmpeg stitching.
*   A single `<video>` element with an `onEnded` event listener swaps the `src` dynamically to the next active take in the array, providing an instantaneous screening room experience.

### 12.6. FCPXML Export Wizard (File System Access API)
*   **Step 1:** Informs the filmmaker that Director AI will download all active takes directly to a local destination folder for offline NLE linking.
*   **Step 2:** Triggers `window.showDirectoryPicker()` to select a target directory on the user's computer.
*   **Step 3:** Displays a live progress bar while writing video takes and the compiled `timeline.fcpxml` (with 1.3x scale transforms for close-up punch-ins) directly to disk.
*   **Conclusion:** Displays a success state confirming: "Export Complete. Drag the timeline.fcpxml file into DaVinci Resolve."

### 12.7. Inspector Drawer Tab Architecture & Pre-Flight Isolation
To eliminate cognitive clutter, inspector cards are strictly segregated across dedicated tabs:
*   **`compose` Tab:** Exclusively hosts the **Pre-Flight Production Checklist** when a scene is ungenerated, guiding the filmmaker through asset readiness and the First Frame Decision before revealing keyframe and camera angle controls.
*   **`takes` Tab:** Exclusively hosts the **Post-Generation Decision Card** ("Active Take Ready", "Accept & Next", and "Iterate & Branch") once a video clip exists, alongside the take variation history list.
*   **`prompts` & `render` Tabs:** Kept completely pristine for raw/enriched prompt copy and targeted video engine render settings.

### 12.8. Deterministic Zero-Overlap Cluster Graph Geometry
In React Flow Cluster Graph view (`viewMode === "graph"`), nodes are arranged in a mathematically guaranteed, symmetrical diamond formation:
*   `sceneSpacing = 1250px`, `startX = 80px`, `centerY = 460px`.
*   **`FrameNode` (288px wide):** Positioned at `(baseX, centerY + 50)`, aligning horizontally with the Video Node's input handle.
*   **`VideoNode` (380px wide):** Positioned at `(baseX + 420, centerY)`, serving as the central hub.
*   **`CharacterNode` (288px wide):** Centered horizontally above `VideoNode` at `(baseX + 466, centerY - 480)`, providing a generous 120px clearance.
*   **`BackgroundNode` (288px wide):** Centered horizontally below `VideoNode` at `(baseX + 466, centerY + 640)`, providing 100px vertical clearance.
*   **Horizontal Inter-Cluster Clearance:** Leaves 450px of clean runway between consecutive scenes, preventing any node collisions as production assets expand.





