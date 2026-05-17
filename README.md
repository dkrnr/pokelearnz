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
OpenAI responds in character as the chosen Pokémon
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
| 🛡️ Content Safety | All inputs filtered before reaching OpenAI. Child-safe on every call |
| 🔐 Secure Deployment | API keys injected at Netlify build time via shell script — never in the repo |

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Voice Transcription | VALSEA `/v1/audio/transcriptions` | Only API that handles South Asian accented English accurately |
| Sentiment Analysis | VALSEA `/v1/sentiment` | Drives emotional adaptation in every Pokémon response |
| AI Responses | OpenAI `gpt-4o-mini` | Fast, cost-efficient, strong character instruction following |
| Pokémon Data | PokéAPI | Free, open, all 1025 Pokémon with sprites and types |
| Frontend | HTML, CSS, Vanilla JS | No framework — zero build complexity, maximum speed |
| Hosting | Netlify | Free tier, automatic GitHub deploys, environment variable support |
| Secret Management | `generate-config.sh` | Writes API keys from Netlify env vars at build time |

---

## 🚀 Running Locally

```bash
git clone https://github.com/dkrnr/pokelearn
cd pokelearn

# Create your config file (never commit this)
cp config.example.js config.js
# Edit config.js and add your API keys:
# CONFIG.VALSEA_KEY = "your_valsea_key"
# CONFIG.OPENAI_KEY = "your_openai_key"

# Serve locally
python3 -m http.server 8080
# Open http://localhost:8080
```

**API keys needed:**
- [VALSEA](https://valsea.ai) — for voice transcription and sentiment
- [OpenAI](https://platform.openai.com) — for Pokémon character responses

---

## 🔐 Security

- API keys stored in Netlify environment variables
- `generate-config.sh` writes keys to `config.js` at build time
- `config.js` is `.gitignore`d — never committed
- No user data collected or stored beyond anonymous localStorage progress
- Content safety filter on all inputs before any OpenAI call

---

## 📁 Project Structure

```
pokelearn/
├── index.html                    # App shell
├── style.css                     # Pokémon-themed UI
├── app.js                        # All app logic
├── pokemonPersonalities.json     # 1025 Pokémon personality prompts
├── config.example.js             # Safe template (no real keys)
├── generate-config.sh            # Netlify build script for key injection
├── netlify.toml                  # Netlify build config
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
| **Ibaad** | Lead Developer — VALSEA integration, OpenAI prompt system, quiz engine, deployment |
| **Dunith** | Frontend & Product — Pokémon selector, UI/UX, personality system, progress tracking |

Built at the **Cursor Colombo Buildathon 2026** in 24 hours at Royal MAS Arena, Colombo, Sri Lanka.

---

## 📄 License

MIT — feel free to build on this.

---

*Built with [Cursor](https://cursor.com) · Powered by [VALSEA](https://valsea.ai) · Pokémon data from [PokéAPI](https://pokeapi.co)*
