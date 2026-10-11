/* =========================================================
   PERSONA AI - POPUP
========================================================= */


/* =========================================================
   BACKEND ANALYSIS
========================================================= */

async function analyzeWithBackend(
    contact,
    messages
) {

    console.log(
        "Persona AI: Sending",
        messages.length,
        "messages to backend."
    );


    const response =
        await fetch(
            "http://127.0.0.1:8000/analyze",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    contact: contact,
                    messages: messages
                })
            }
        );


    if (!response.ok) {

        throw new Error(
            `Backend returned ${response.status}`
        );
    }


    return await response.json();
}


/* =========================================================
   SEND MESSAGE TO CONTENT SCRIPT
========================================================= */

function sendMessageToTab(
    tabId,
    message
) {

    return new Promise(
        (resolve, reject) => {

            chrome.tabs.sendMessage(
                tabId,
                message,
                response => {

                    if (
                        chrome.runtime.lastError
                    ) {

                        reject(
                            new Error(
                                chrome.runtime
                                    .lastError
                                    .message
                            )
                        );

                        return;
                    }


                    resolve(response);
                }
            );

        }
    );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MERGE MESSAGES
========================================================= */

function mergeMessages(
    existingMessages,
    newMessages
) {

    const merged = [
        ...existingMessages
    ];


    /*
       Keep track of messages already present.

       Prefer WhatsApp dataId when available.
       Otherwise use sender + text.
    */

    const existingKeys =
        new Set();


    existingMessages.forEach(
        message => {

            const key =
                message.dataId
                    ? `id:${message.dataId}`
                    : `text:${message.senderType}|${message.text}`;

            existingKeys.add(key);
        }
    );


    newMessages.forEach(
        message => {

            const key =
                message.dataId
                    ? `id:${message.dataId}`
                    : `text:${message.senderType}|${message.text}`;


            if (!existingKeys.has(key)) {

                merged.push(message);

                existingKeys.add(key);
            }
        }
    );


    return merged;
}


/* =========================================================
   DISPLAY REPLY BUTTONS
========================================================= */

function attachReplyButtons(
    tabId
) {

    document
        .querySelectorAll(".reply-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const reply =
                        button.dataset.reply;


                    button.disabled = true;

                    const oldText =
                        button.innerText;

                    button.innerText =
                        "Inserting...";


                    try {

                        const result =
                            await sendMessageToTab(
                                tabId,
                                {
                                    action:
                                        "insertReply",

                                    reply:
                                        reply
                                }
                            );


                        if (
                            result &&
                            result.success
                        ) {

                            button.innerText =
                                "✓ Inserted";

                        }
                        else {

                            button.innerText =
                                oldText;

                            console.error(
                                "Reply insertion failed:",
                                result
                            );
                        }


                    }
                    catch (error) {

                        console.error(
                            "Reply insertion error:",
                            error
                        );


                        button.innerText =
                            oldText;
                    }

                }
            );

        });
}


/* =========================================================
   DISPLAY ANALYSIS
========================================================= */

function displayAnalysis(
    chatBox,
    data
) {

    const analysis =
        data.analysis || {};


    let html = "";


    html += `
        <hr>

        <h3>
            Persona AI Analysis
        </h3>

        <p>
            <b> Chat:</b>
            ${escapeHtml(data.contact)}
        </p>

        <p>
            <b> Messages:</b>
            ${data.message_count}
        </p>

        <p>
            <b> Sentiment:</b>
            ${escapeHtml(analysis.sentiment)}
        </p>

        <p>
            <b> Emotion:</b>
            ${escapeHtml(analysis.emotion)}
        </p>

        <p>
            <b> Urgency:</b>
            ${escapeHtml(analysis.urgency)}
        </p>

        <p>
            <b> Conversation:</b>
            ${escapeHtml(
                analysis.conversation_type
            )}
        </p>

        <hr>

        <h3>
             Summary
        </h3>

        <p>
            ${escapeHtml(
                analysis.summary
            )}
        </p>

        <hr>

        <h3>
            Suggested Replies
        </h3>
    `;


    const replies =
        Array.isArray(
            analysis.reply_suggestions
        )
            ? analysis.reply_suggestions
            : [];


    replies.forEach(
        (reply, index) => {

            html += `
                <button
                    class="reply-btn"
                    data-reply="${escapeHtml(reply)}"
                    style="
                        width:100%;
                        margin:5px 0;
                        padding:10px;
                        cursor:pointer;
                    "
                >
                    ${index + 1}. ${escapeHtml(reply)}
                </button>
            `;

        }
    );


    if (
        analysis.context_sufficient === false
    ) {

        html += `
            <p
                style="
                    font-size:12px;
                    color:#777;
                    margin-top:10px;
                "
            >
                ℹ️ Persona AI used the available
                conversation context. More history
                could not be loaded or was not required.
            </p>
        `;
    }


    chatBox.innerHTML += html;
}


/* =========================================================
   SCAN CHAT
========================================================= */

document
    .getElementById("scanBtn")
    .addEventListener(
        "click",
        async () => {

            const status =
                document.getElementById(
                    "status"
                );

            const chatBox =
                document.getElementById(
                    "chatBox"
                );


            status.innerText =
                "Scanning recent conversation...";


            chatBox.innerHTML =
                "";


            try {

                /* =========================================
                   GET ACTIVE TAB
                ========================================= */

                const [tab] =
                    await chrome.tabs.query({
                        active: true,
                        currentWindow: true
                    });


                if (!tab || !tab.id) {

                    status.innerText =
                        "WhatsApp tab not found.";

                    return;
                }


                /* =========================================
                   INITIAL SCAN
                ========================================= */

                const response =
                    await sendMessageToTab(
                        tab.id,
                        {
                            action:
                                "scanChat"
                        }
                    );


                if (!response) {

                    status.innerText =
                        "No response from content script.";

                    return;
                }


                if (
                    !response.success
                ) {

                    status.innerText =
                        "Could not scan chat.";

                    return;
                }


                let contact =
                    response.contact ||
                    "Unknown";


                /*
                   These are our initially visible
                   / recent messages.
                */

                let allMessages =
                    response.messages || [];


                console.log(
                    "Initial messages:",
                    allMessages
                );


                /* =========================================
                   SHOW INITIAL MESSAGE COUNT
                ========================================= */

                status.innerText =
                    `Found ${allMessages.length} recent messages`;


                chatBox.innerHTML = `
                    <h3>
                        👤 ${escapeHtml(contact)}
                    </h3>

                    <p>
                        Analyzing recent conversation...
                    </p>
                `;


                /* =========================================
                   PROGRESSIVE CONTEXT ANALYSIS
                ========================================= */

                let analysisData =
                    null;


                /*
                   Maximum number of times we will
                   scroll upward for older history.

                   This prevents the extension from
                   endlessly scrolling through a
                   very large WhatsApp chat.
                */

                const MAX_HISTORY_LOADS = 3;


                for (
                    let level = 0;
                    level <= MAX_HISTORY_LOADS;
                    level++
                ) {


                    /* =====================================
                       STATUS
                    ===================================== */

                    if (level === 0) {

                        status.innerText =
                            `Analyzing recent messages (${allMessages.length})...`;

                    }
                    else {

                        status.innerText =
                            `Loading older context (${level}/${MAX_HISTORY_LOADS})...`;
                    }


                    /* =====================================
                       SEND CURRENT CONTEXT TO GEMINI
                    ===================================== */

                    analysisData =
                        await analyzeWithBackend(
                            contact,
                            allMessages
                        );

                        if (
    analysisData.latest_sender === "you"
) {

    console.log(
        "Persona AI: Latest message was sent by You."
    );

    status.innerText =
        "No reply needed — you already replied.";

    chatBox.innerHTML = `
        <h3>
            👤 ${escapeHtml(contact)}
        </h3>

        <hr>

        <h3>
            🤖 Persona AI
        </h3>

        <p>
            ✅ You already replied to the latest message.
        </p>

        <p style="color:#777;">
            Persona AI will wait for the next incoming
            message.
        </p>
    `;

    break;
}


                    const analysis =
                        analysisData.analysis ||
                        {};


                    console.log(
                        "================================="
                    );

                    console.log(
                        "CONTEXT LEVEL:",
                        level
                    );

                    console.log(
                        "MESSAGES:",
                        allMessages.length
                    );

                    console.log(
                        "CONTEXT SUFFICIENT:",
                        analysis.context_sufficient
                    );

                    console.log(
                        "LATEST CONTACT:",
                        analysisData.latest_contact_message
                    );

                    console.log(
                        "================================="
                    );


                    /* =====================================
                       ENOUGH CONTEXT
                    ===================================== */

                    if (
                        analysis.context_sufficient === true
                    ) {

                        console.log(
                            "Persona AI: Context is sufficient."
                        );

                        status.innerText =
                            "Context understood ✓";

                        break;
                    }


                    /* =====================================
                       MAX HISTORY REACHED
                    ===================================== */

                    if (
                        level === MAX_HISTORY_LOADS
                    ) {

                        console.log(
                            "Persona AI: Maximum history reached."
                        );

                        status.innerText =
                            "Analysis completed using available context.";

                        break;
                    }


                    /* =====================================
                       LOAD OLDER WHATSAPP MESSAGES
                    ===================================== */

                    status.innerText =
                        "Need more context — loading older messages...";


                    const olderResponse =
                        await sendMessageToTab(
                            tab.id,
                            {
                                action:
                                    "loadOlderMessages",

                                contextLevel:
                                    level + 1
                            }
                        );


                    if (
                        !olderResponse ||
                        !olderResponse.success
                    ) {

                        console.log(
                            "Could not load older messages."
                        );

                        break;
                    }


                    if (
                        !olderResponse.loaded
                    ) {

                        console.log(
                            "No additional history was loaded."
                        );

                        break;
                    }


                    const olderMessages =
                        olderResponse.messages ||
                        [];


                    const previousCount =
                        allMessages.length;


                    /*
                       IMPORTANT:

                       Do NOT replace allMessages.

                       WhatsApp may remove the latest
                       messages from the DOM while
                       scrolling upward.

                       Therefore we MERGE the newly
                       loaded older messages with the
                       recent messages we already saved.
                    */

                    allMessages =
                        mergeMessages(
                            allMessages,
                            olderMessages
                        );


                    console.log(
                        `History expanded: ${previousCount} → ${allMessages.length} messages`
                    );


                    /*
                       If absolutely nothing new was
                       loaded, stop instead of sending
                       the same context repeatedly.
                    */

                    if (
                        allMessages.length ===
                        previousCount
                    ) {

                        console.log(
                            "No new messages found."
                        );

                        break;
                    }

                }


                /* =========================================
                   DISPLAY FINAL RESULT
                ========================================= */

                chatBox.innerHTML = `
                    <h3>
                        👤 ${escapeHtml(contact)}
                    </h3>

                    <p>
                        <b>📚 Context messages:</b>
                        ${allMessages.length}
                    </p>
                `;


                if (analysisData) {

                    displayAnalysis(
                        chatBox,
                        {
                            ...analysisData,
                            message_count:
                                allMessages.length
                        }
                    );

                }


                /* =========================================
                   REPLY BUTTONS
                ========================================= */

                attachReplyButtons(
                    tab.id
                );


                status.innerText =
                    `Analysis complete — ${allMessages.length} messages used.`;


            }
            catch (error) {

                console.error(
                    "Persona AI Error:",
                    error
                );


                status.innerText =
                    "Error";


                chatBox.innerHTML += `
                    <hr>

                    <h3
                        style="color:red;"
                    >
                        Backend / Extension Error
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>
                `;
            }

        }
    );