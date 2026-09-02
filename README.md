# PokeLearn 🎮
### Learn by Talking. Talk to Your Pokémon.

> **Cursor Colombo Buildathon 2026 · Best Use of VALSEA Track**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-pokelearnz.netlify.app-orange?style=for-the-badge)](https://pokelearnz.netlify.app/)
[![Track](https://img.shields.io/badge/Track-Best%20Use%20of%20VALSEA-blue?style=for-the-badge)](https://valsea.ai)
[![Built in](https://img.shields.io/badge/Built%20in-24%20Hours-red?style=for-the-badge)](https://pokelearnz.netlify.app/)

---

## 🧠 The Problem

Voice AI fails South Asian kids.

A child in Sri Lanka who says *"Pikachu, what is photosynthesis ah?"* gets gibberish back from Google, Siri, or Alexa — because these engines are trained almost entirely on Western English. Over 500 million school-age children across South and Southeast Asia are effectively locked out of voice-based learning tools, not because of ability, but because of accent.

## ✨ The Solution

PokeLearn lets kids pick any of **1025 Pokémon** as their teacher and learn any subject by simply talking — in their natural accent, with their natural slang, in the way they actually speak.

**VALSEA** handles the voice layer. It understands Sri Lankan and South Asian accented English the way no mainstream speech engine does. Every question is transcribed accurately, every emotion detected, and every response adapted to how the child is feeling in that moment.

---

## 🎯 How It Works

```
Child speaks naturally
        ↓
VALSEA transcribes with accent awareness
        ↓
VALSEA sentiment detects emotion (confused? confident? frustrated?)
        ↓
OpenRouter responds in character as the chosen Pokémon
adapted to the child's emotional state
        ↓
Every 3 questions → auto MCQ quiz with star rewards
```

---

## 🔥 Features

| Feature | What it does |
|---|---|
| 🎤 VALSEA Voice Transcription | Understands Sri Lankan and South Asian accented English accurately |
| 💬 Sentiment-Driven Responses | Pokémon adapts tone based on VALSEA emotion detection |
| 🐾 All 1025 Pokémon | Every Pokémon with a unique teaching personality + shiny toggle |
| 🧪 Auto MCQ Quiz System | Quizzes generated every 3 questions with star burst rewards |
| 📚 8 Subject Categories | Science, Math, English, Geography, History, Nature, Art, Technology — auto-detected |
| ♿ Text Chat Fallback | Full accessibility for deaf users or noisy environments |
| ⭐ Progress Tracking | Daily questions, stars, and streaks via localStorage |
| 🛡️ Content Safety | All inputs filtered before reaching the chat model. Child-safe on every call |
| 🔐 Secure Deployment | API keys stay on the server — OpenRouter and VALSEA calls go through Netlify functions |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Voice Transcription | VALSEA `/v1/audio/transcriptions` | Only API that handles South Asian accented English accurately |
| Sentiment Analysis | VALSEA `/v1/sentiment` | Drives emotional adaptation in every Pokémon response |
| AI Responses | OpenRouter (`google/gemma-4-31b-it:free`) | Free, strong character instruction following, no OpenAI billing |
| Pokémon Data | PokéAPI | Free, open, all 1025 Pokémon with sprites and types |
| Frontend | HTML, CSS, Vanilla JS | No framework — zero build complexity, maximum speed |
| Hosting | Netlify | Free tier, automatic GitHub deploys, serverless functions |
| Secret Management | Netlify env vars | `OPENROUTER_KEY` / `VALSEA_KEY` used only inside serverless functions |

---

## 🚀 Local development

API keys never ship to the browser. Locally, Netlify Functions need a `.env` file (gitignored) and `netlify dev` — a static server like `python3 -m http.server` will not proxy `/.netlify/functions/*`.

```bash
git clone https://github.com/dkrnr/pokelearn
cd pokelearn

# Create .env (never commit this)
cat > .env << EOF
VALSEA_KEY=your_valsea_key
OPENROUTER_KEY=your_openrouter_key
EOF

# Requires the Netlify CLI: npm install -g netlify-cli
netlify dev
# Open the URL it prints (usually http://localhost:8888)
```

**API keys needed:**
- [VALSEA](https://valsea.ai) — for voice transcription and sentiment
- [OpenRouter](https://openrouter.ai) — for Pokémon character responses (free models, no card required)

---

## 🔐 Security

- API keys stored in Netlify environment variables (`OPENROUTER_KEY`, `VALSEA_KEY`)
- Browser calls only `/.netlify/functions/chat`, `/transcribe`, and `/sentiment` — keys never leave the server
- `.env` is `.gitignore`d — never committed
- No user data collected or stored beyond anonymous localStorage progress
- Content safety filter on all inputs before any chat-model call

---

## 📁 Project Structure

```
pokelearn/
├── index.html                    # App shell
├── style.css                     # Pokémon-themed UI
├── app.js                        # All app logic
├── pokemonPersonalities.json     # 1025 Pokémon personality prompts
├── netlify.toml                  # Publish dir + functions path
├── netlify/functions/            # OpenRouter + VALSEA proxies (keys stay here)
│   ├── chat.js
│   ├── transcribe.js
│   └── sentiment.js
└── README.md
```

---

## 👾 Easter Eggs

Find **Ursaluna** and ask who made this app.
Find **Vespiquen** and ask who is it's trainer and more.

---

## 👥 Team

| Name | Role |
|---|---|
| **Dunith** | Lead Developer — VALSEA integration, OpenAI prompt system, quiz engine, deployment |
| **Ibaad** | Frontend & Product — Pokémon selector, UI/UX, personality system, progress tracking, API integration |
| **Zahrah** | Lead Tester — QA Engineer, Analyst, Advisor, Editor, Feedback   |

Built at the **Cursor Colombo Buildathon 2026** in 24 hours at Royal MAS Arena, Colombo, Sri Lanka.

---

## 📄 License

MIT — feel free to build on this.

---

*Built with [Cursor](https://cursor.com) · Powered by [VALSEA](https://valsea.ai) · Pokémon data from [PokéAPI](https://pokeapi.co)*
