# Orbix — Reactive AI XR Companion

Orbix is a browser-based WebXR experience that introduces a floating AI orb acting as a real-time study companion. It combines spatial tracking, behavioral interaction, and AI-driven communication to create a digital presence that helps users stay focused.

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/orbix.git
cd orbix
```

### 2. Set up environment variables
Copy the example environment file and add your API keys:
```bash
cp .env.example .env
```
Edit `.env` and add your `OPENROUTER_API_KEY`.

### 3. Install dependencies
```bash
npm install
```

### 4. Run locally

#### Option A: Using Vercel CLI (Recommended)
This automatically handles the frontend and the `/api` functions:
```bash
npm install -g vercel
vercel dev
```

#### Option B: Separate Frontend & Backend
1. **Start the API Server:**
   You can use a tool like `ts-node` or `node` to run a local wrapper for the API, or simply use the Vercel CLI. Ensure it runs on **port 3000**.
2. **Start the Vite Dev Server:**
   ```bash
   npm run dev
   ```
   Vite will now proxy `/api/chat` to `localhost:3000/api/chat`.

## 🛠️ Tech Stack
- **Engine:** [Three.js](https://threejs.org/)
- **XR:** WebXR Device API
- **AI:** [OpenRouter](https://openrouter.ai/)
- **Voice:** Web Speech API
- **Build Tool:** [Vite](https://vitejs.dev/)

## 📂 Project Structure
- `src/`: Core logic and 3D scene management.
- `public/`: Static assets (textures, sounds).
- `server/`: (Optional) Node.js backend logic.
- `.planning/`: Project roadmap and architectural decisions.

## 📜 License
ISC License. See `LICENSE` for more details.
