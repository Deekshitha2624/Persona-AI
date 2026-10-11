# =========================================================
# PERSONA AI - FASTAPI BACKEND
# =========================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from ai.gemini_client import analyze_conversation


# =========================================================
# CREATE APP
# =========================================================

app = FastAPI(
    title="Persona AI",
    description="AI-powered WhatsApp reply assistant",
    version="1.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    # Allow WhatsApp Web extension to communicate
    # with the local FastAPI backend.
    allow_origins=[
        "https://web.whatsapp.com"
    ],

    allow_credentials=False,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# =========================================================
# REQUEST MODEL
# =========================================================

class ChatRequest(BaseModel):

    contact: str

    messages: list


# =========================================================
# HOME / HEALTH CHECK
# =========================================================

@app.get("/")
def home():

    return {
        "status": "Backend Running",
        "project": "Persona AI"
    }


# =========================================================
# ANALYZE CHAT
# =========================================================

@app.post("/analyze")
def analyze_chat(chat: ChatRequest):

    # =====================================================
    # EMPTY CHAT
    # =====================================================

    if not chat.messages:

        return {
            "contact": chat.contact,

            "message_count": 0,

            "latest_message": None,

            "latest_sender": None,

            "needs_reply": False,

            "analysis": {

                "context_sufficient": False,

                "sentiment": "Unknown",

                "emotion": "Unknown",

                "urgency": "Unknown",

                "conversation_type": "Unknown",

                "summary": "No messages found.",

                "reply_suggestions": []
            }
        }


    # =====================================================
    # FIND LATEST MESSAGE
    # =====================================================

    latest_message = None

    latest_sender = "unknown"


    for msg in reversed(chat.messages):

        if not isinstance(msg, dict):
            continue

        text = str(
            msg.get("text", "")
        ).strip()

        sender_type = msg.get(
            "senderType",
            "unknown"
        )

        if text:

            latest_message = text

            latest_sender = sender_type

            break


    # =====================================================
    # DEBUG LATEST MESSAGE
    # =====================================================

    print(
        "\n=============================================="
    )

    print(
        "PERSONA AI REQUEST RECEIVED"
    )

    print(
        f"Contact: {chat.contact}"
    )

    print(
        f"Messages received: {len(chat.messages)}"
    )

    print(
        f"Latest sender: {latest_sender}"
    )

    print(
        f"Latest message: {latest_message}"
    )

    print(
        "==============================================\n"
    )


    # =====================================================
    # IF LATEST MESSAGE WAS SENT BY YOU
    # =====================================================

    if latest_sender == "you":

        print(
            "Latest message was sent by YOU."
        )

        print(
            "No reply required."
        )

        return {

            "contact":
                chat.contact,

            "message_count":
                len(chat.messages),

            "latest_message":
                latest_message,

            "latest_sender":
                "you",

            "needs_reply":
                False,

            "analysis": {

                "context_sufficient":
                    True,

                "sentiment":
                    "Not Applicable",

                "emotion":
                    "Not Applicable",

                "urgency":
                    "Low",

                "conversation_type":
                    "Not Applicable",

                "summary":
                    "The latest message was sent by you. No reply is currently required.",

                "reply_suggestions":
                    []
            }
        }


    # =====================================================
    # BUILD CONVERSATION FOR GEMINI
    # =====================================================

    conversation = ""


    for msg in chat.messages:

        if not isinstance(msg, dict):
            continue


        text = str(
            msg.get("text", "")
        ).strip()


        if not text:
            continue


        sender_type = msg.get(
            "senderType",
            "unknown"
        )


        if sender_type == "you":

            conversation += (
                f"You: {text}\n"
            )


        elif sender_type == "contact":

            conversation += (
                f"Contact: {text}\n"
            )


        else:

            conversation += (
                f"Unknown: {text}\n"
            )


    # =====================================================
    # DEBUG - SHOW WHAT IS SENT TO GEMINI
    # =====================================================

    print(
        "\n=============================================="
    )

    print(
        "PERSONA AI CHAT ANALYSIS"
    )

    print(
        "=============================================="
    )

    print(
        f"Chat: {chat.contact}"
    )

    print(
        f"Total messages: {len(chat.messages)}"
    )

    print(
        f"Latest sender: {latest_sender}"
    )

    print(
        f"Latest message: {latest_message}"
    )

    print(
        "\n---------- CONVERSATION SENT TO GEMINI ----------"
    )

    print(
        conversation
    )

    print(
        "==================================================\n"
    )


    # =====================================================
    # SEND TO GEMINI
    # =====================================================

    try:

        result = analyze_conversation(
            conversation
        )

    except Exception as error:

        print(
            "\n❌ GEMINI ERROR:"
        )

        print(
            error
        )

        return {

            "contact":
                chat.contact,

            "message_count":
                len(chat.messages),

            "latest_message":
                latest_message,

            "latest_sender":
                latest_sender,

            "needs_reply":
                False,

            "analysis": {

                "context_sufficient":
                    False,

                "sentiment":
                    "Unknown",

                "emotion":
                    "Unknown",

                "urgency":
                    "Unknown",

                "conversation_type":
                    "Unknown",

                "summary":
                    "Unable to contact Gemini.",

                "reply_suggestions":
                    []
            }
        }


    # =====================================================
    # PARSE GEMINI RESPONSE
    # =====================================================

    try:

        analysis = json.loads(
            result
        )

    except json.JSONDecodeError:

        print(
            "\n⚠️ Gemini returned invalid JSON."
        )

        print(
            "Raw Gemini response:"
        )

        print(
            result
        )

        analysis = {

            "context_sufficient":
                False,

            "sentiment":
                "Unknown",

            "emotion":
                "Unknown",

            "urgency":
                "Unknown",

            "conversation_type":
                "Unknown",

            "summary":
                result,

            "reply_suggestions":
                []
        }


    # =====================================================
    # ENSURE REQUIRED FIELDS
    # =====================================================

    if "context_sufficient" not in analysis:

        analysis[
            "context_sufficient"
        ] = False


    if "sentiment" not in analysis:

        analysis[
            "sentiment"
        ] = "Unknown"


    if "emotion" not in analysis:

        analysis[
            "emotion"
        ] = "Unknown"


    if "urgency" not in analysis:

        analysis[
            "urgency"
        ] = "Unknown"


    if "conversation_type" not in analysis:

        analysis[
            "conversation_type"
        ] = "Unknown"


    if "summary" not in analysis:

        analysis[
            "summary"
        ] = ""


    if "reply_suggestions" not in analysis:

        analysis[
            "reply_suggestions"
        ] = []


    # =====================================================
    # MAKE SURE REPLY SUGGESTIONS ARE A LIST
    # =====================================================

    if not isinstance(
        analysis["reply_suggestions"],
        list
    ):

        analysis[
            "reply_suggestions"
        ] = []


    # =====================================================
    # DEBUG FINAL RESULT
    # =====================================================

    print(
        "\n=============================================="
    )

    print(
        "PERSONA AI RESULT"
    )

    print(
        f"Reply suggestions: "
        f"{analysis['reply_suggestions']}"
    )

    print(
        "==============================================\n"
    )


    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return {

        "contact":
            chat.contact,

        "message_count":
            len(chat.messages),

        "latest_message":
            latest_message,

        "latest_sender":
            latest_sender,

        "needs_reply":
            True,

        "analysis":
            analysis
    }