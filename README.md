# CrossTalk

CrossTalk is a real-time conversation app for two people who speak different languages. Each message displays the original text alongside its translation. Users can reply to specific messages and mark clarifications or changes of mind.

## Features

- Two-person chat rooms using a shared room name; no account required.
- Per-participant language selection.
- Original and translated messages.
- Message-specific replies, clarification markers, and change-of-mind markers.
- React, Vite, and TypeScript frontend.
- Express, TypeScript, and Socket.IO backend.
- Python translation service using Argos Translate for most language pairs.
- MyMemory API integration for Spanish-to-English translation.
- Mock translation provider for development and testing.
- Automated tests for server and frontend behavior.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Python with `argostranslate` installed for local translation
- Internet access for Spanish-to-English translation through MyMemory

## Installation

From the repository root, install the Node.js dependencies:

```bash
npm install
```

Copy `.env.example` to `apps/server/.env`.

For mock mode, keep:

```dotenv
TRANSLATION_PROVIDER=mock
```

For local translation, configure `apps/server/.env` as follows:

```dotenv
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
TRANSLATION_PROVIDER=argos
TRANSLATION_SERVICE_URL=http://127.0.0.1:3002/translate
```

Do not commit local `.env` files or secrets.

## Running locally

Start the Python translation service in a separate terminal from the repository root:

```bash
python apps/server/translation_service.py
```

If Python or Argos Translate is not installed, install the required Python package and the Argos language models needed for your chosen languages before starting the service.

Start the Node.js backend and React frontend in another terminal:

```bash
npm run dev
```

Open the frontend at:

http://localhost:5173

Enter your name, select a language, and choose a room name. Share the same room name with one other participant. Each room supports up to two participants.

Keep both terminals running while using local translation mode.

## Translation configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Node.js server port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed browser origin for CORS |
| `TRANSLATION_PROVIDER` | `mock` | Selects the mock or Argos provider |
| `TRANSLATION_SERVICE_URL` | `http://127.0.0.1:3002/translate` | Python translation endpoint |
| `VITE_SERVER_URL` | `http://localhost:3001` | Optional frontend server URL |

### Translation behavior

- **Mock mode:** Returns the original text for matching languages and a visibly labelled placeholder for different languages. It does not perform real translation.
- **Argos mode:** Sends translation requests to the local Python service on port 3002.
- **Spanish to English:** The Python service uses the MyMemory translation API.
- **Other supported language pairs:** The Python service uses installed Argos Translate models and may attempt English as an intermediate language for certain pairs.

Spanish-to-English translation requires internet access. Other language pairs require the relevant Argos language models to be installed.

If the translation service is unavailable, translation requests can fail. The application's message handler should be tested to confirm how it handles that failure.

## Health check

When the Python service is running, its health endpoint is:

http://127.0.0.1:3002/health

The Node.js server exposes:

http://localhost:3001/health

## Tests and production build

Run from the repository root:

```bash
npm test
npm run build
```

## Current limitations

- Room state and messages are held in server memory and are lost when the server restarts.
- There are no user accounts or persistent message storage.
- Translation quality depends on the installed Argos models or the external MyMemory service.
- This project is an MVP intended for development and evaluation, not a production deployment.
