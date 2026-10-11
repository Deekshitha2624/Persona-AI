# Persona AI - AI-Powered WhatsApp Reply Assistant

Persona AI is an AI-powered communication assistant designed to help users generate context-aware replies to conversations on WhatsApp Web. It combines a Chrome browser extension, a FastAPI backend, and Google's Gemini API to analyze recent conversation messages and suggest relevant responses.

The goal is to make digital communication more efficient by providing personalized reply suggestions based on conversational context.

## Features

- **Context-Aware Chat Analysis:** Scans recent messages from the currently open WhatsApp conversation to understand the discussion.
- **AI-Generated Reply Suggestions:** Uses Google's Gemini API to generate up to three possible replies based on the conversation.
- **Conversation Analysis:** Identifies sentiment, emotion, urgency, conversation type, and a short summary.
- **Floating Assistant Interface:** Provides a Persona AI button within WhatsApp Web for requesting reply suggestions.
- **Reply Insertion:** Allows users to select a suggested reply and insert it into the WhatsApp message composer.
- **User-Controlled Messaging:** Users review the generated reply and manually send it through WhatsApp.
- **Local Backend:** Uses FastAPI to process chat context and communicate with the AI model.

## How It Works

1. The user opens a conversation on WhatsApp Web.
2. The user clicks the Persona AI floating button.
3. The Chrome extension extracts recent messages from the open conversation.
4. The extension sends the conversation context to the FastAPI backend.
5. The backend processes the messages and requests analysis and reply suggestions from Gemini.
6. The generated suggestions are displayed in the Persona AI interface.
7. The user selects a suggestion, which is inserted into the WhatsApp message composer.
8. The user reviews and manually sends the message.

## System Architecture

```text
WhatsApp Web
     |
     v
Chrome Extension
     |
     v
WhatsApp DOM Message Scanner
     |
     v
Background Service Worker
     |
     v
FastAPI Backend
     |
     v
Google Gemini API
     |
     v
Conversation Analysis
and Reply Suggestions
     |
     v
Persona AI Interface
     |
     v
WhatsApp Message Composer
```
## Prerequisites

Before running Persona AI, install or configure:

- Python 3.10 or a compatible version
- Google Chrome
- A Google Gemini API key
- The Python dependencies listed in `backend/requirements.txt`
- A working internet connection for Gemini API requests

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/Persona-AI.git
cd Persona-AI
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholder with your own API key. Do not commit the `.env` file or publish your API key.

### 3. Start the FastAPI Server

From the `backend` directory, run:

```bash
uvicorn main:app --reload
```

The local backend should be available at:

```text
http://127.0.0.1:8000
```

You can check the backend status by opening:

```text
http://127.0.0.1:8000/
```

### 4. Load the Chrome Extension

1. Open Google Chrome.
2. Navigate to `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select the project's `extension` folder.
6. Open WhatsApp Web and allow the page to load.
7. Keep the FastAPI backend running while using the extension.

### 5. Use Persona AI

1. Open a WhatsApp conversation.
2. Click the Persona AI floating button.
3. Wait for the conversation analysis and reply suggestions.
4. Select a suggested reply.
5. Review the inserted message and manually send it.

## API Endpoint

### Analyze Conversation

**Endpoint:** `POST /analyze`

The backend accepts the contact name and conversation messages as JSON.

Example request:

```json
{
  "contact": "Contact Name",
  "messages": [
    {
      "sender": "Contact Name",
      "senderType": "contact",
      "text": "Can you share the project report?"
    },
    {
      "sender": "You",
      "senderType": "you",
      "text": "I will send it shortly."
    },
    {
      "sender": "Contact Name",
      "senderType": "contact",
      "text": "Please send it today."
    }
  ]
}
```

The backend processes the supplied context and returns conversation metadata, analysis, and reply suggestions when generation succeeds.

The exact response fields depend on the backend implementation.

## Security and Privacy

- Keep API keys and credentials in environment variables.
- Exclude `.env` files from version control.
- Review generated replies before sending them.
- Do not send sensitive or confidential conversations to an external AI service without appropriate consent.
- Use the extension only with authorized access to WhatsApp Web.
- Persona AI is designed to assist with composing replies; the user remains responsible for sending messages.

## Current Limitations

- The extension depends on WhatsApp Web's DOM structure, which may change.
- Message extraction can be affected by unsupported message types or changes to the WhatsApp interface.
- AI responses may occasionally be inaccurate, incomplete, or inconsistent with the intended tone.
- The backend requires a valid Gemini API key and network access.
- Reply generation depends on the quality and availability of the configured AI model.
- The project currently focuses on conversations that are open in WhatsApp Web.

## Future Enhancements

- Improve sender identification and conversational role detection.
- Personalize replies based on the user's preferred communication style.
- Add tone controls for professional, casual, friendly, and concise replies.
- Improve multilingual conversation understanding.
- Add better error handling and backend health checks.
- Improve the extension interface and accessibility.
- Add configurable context length and reply preferences.
- Explore additional AI models and deployment options.

## Disclaimer

Persona AI is an independent educational project. It is not affiliated with, endorsed by, or officially connected to WhatsApp or Google. WhatsApp is a trademark of its respective owner.

## Author

**Deekshitha S**



GitHub: [YOUR_GITHUB_PROFILE](https://github.com/YOUR_USERNAME)

