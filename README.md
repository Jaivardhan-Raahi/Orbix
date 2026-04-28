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
```bash
npm run dev
```
Open the provided URL in a WebXR-compatible browser (e.g., Chrome on Android or Oculus Browser).

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
