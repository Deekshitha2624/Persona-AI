// ============================================================
// PERSONA AI - BACKGROUND SERVICE WORKER
// ============================================================

console.log("🤖 Persona AI background service worker loaded");


// ============================================================
// MESSAGE HANDLER
// ============================================================

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {

        // ====================================================
        // ANALYZE CHAT
        // ====================================================

        if (request.action === "analyzeChat") {

            console.log(
                "📨 Background received chat for analysis"
            );

            analyzeChatWithBackend(
                request.contact,
                request.messages
            )
            .then((result) => {

                console.log(
                    "✅ Backend response received"
                );

                sendResponse({
                    success: true,
                    result: result
                });

            })
            .catch((error) => {

                console.error(
                    "❌ Backend request failed:",
                    error
                );

                sendResponse({
                    success: false,
                    error: error.message
                });

            });

            // IMPORTANT:
            // Keeps sendResponse available for async response
            return true;
        }


        // ====================================================
        // PING
        // ====================================================

        if (request.action === "ping") {

            sendResponse({
                success: true,
                message: "Persona AI background is running"
            });

            return true;
        }

    }
);


// ============================================================
// SEND CHAT TO FASTAPI
// ============================================================

async function analyzeChatWithBackend(
    contact,
    messages
) {

    console.log(
        "🤖 Sending chat to FastAPI..."
    );

    console.log(
        "👤 Contact:",
        contact
    );

    console.log(
        "💬 Messages:",
        messages.length
    );


    const response = await fetch(
        "http://127.0.0.1:8000/analyze",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                contact: contact,

                messages: messages

            })
        }
    );


    // ========================================================
    // CHECK HTTP STATUS
    // ========================================================

    if (!response.ok) {

        throw new Error(
            `Backend returned HTTP ${response.status}`
        );
    }


    // ========================================================
    // PARSE RESPONSE
    // ========================================================

    const result =
        await response.json();


    console.log(
        "🤖 Persona AI backend result:",
        result
    );


    return result;
}