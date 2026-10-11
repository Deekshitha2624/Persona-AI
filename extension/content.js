// ============================================================
// PERSONA AI
// WhatsApp Web AI Reply Assistant
// ============================================================

console.log("🤖 Persona AI Loaded");


// ============================================================
// STATE
// ============================================================

let isAnalyzing = false;


// ============================================================
// GET CURRENT CONTACT
// ============================================================

function getCurrentContact() {

    const selectors = [

        'header span[title]',

        'header span[dir="auto"]',

        'header [data-testid="conversation-header"] span'

    ];


    for (const selector of selectors) {

        const elements =
            document.querySelectorAll(selector);


        for (const element of elements) {

            const text =
                element.getAttribute("title") ||
                element.innerText ||
                element.textContent;


            if (
                text &&
                text.trim() &&
                text.trim() !== "You" &&
                text.trim().length < 100
            ) {

                return text.trim();

            }

        }

    }


    return "Unknown";
}


// ============================================================
// GET MESSAGE CONTAINERS
// ============================================================

function getMessageContainers() {

    return [
        ...document.querySelectorAll(
            'div[data-testid="msg-container"]'
        )
    ];
}


// ============================================================
// GET MESSAGE TEXT
// ============================================================

function getMessageText(container) {

    if (!container) {
        return "";
    }


    const textElement =
        container.querySelector(
            '[data-testid="selectable-text"]'
        );


    if (!textElement) {
        return "";
    }


    return (
        textElement.innerText ||
        textElement.textContent ||
        ""
    ).trim();
}


// ============================================================
// GET SENDER
// ============================================================

function getSender(container) {

    if (!container) {
        return "Unknown";
    }


    // --------------------------------------------------------
    // PRIMARY METHOD
    // --------------------------------------------------------

    const senderElement =
        container.querySelector(
            'span[aria-label]'
        );


    if (senderElement) {

        const sender =
            senderElement.getAttribute(
                "aria-label"
            );


        if (sender && sender.trim()) {

            return sender.trim();

        }

    }


    // --------------------------------------------------------
    // FALLBACK: WHATSAPP METADATA
    // --------------------------------------------------------

    const metadata =
        container.querySelector(
            '.copyable-text[data-pre-plain-text]'
        );


    if (metadata) {

        const value =
            metadata.getAttribute(
                "data-pre-plain-text"
            );


        if (value) {

            /*
                Example:

                [8:18 PM, 10/5/2026] DEEPIKA:
            */

            const match =
                value.match(
                    /\]\s*(.*?):\s*$/
                );


            if (match && match[1]) {

                return match[1].trim();

            }

        }

    }


    return "Unknown";
}


// ============================================================
// DETERMINE SENDER TYPE
// ============================================================

function getSenderType(sender) {

    if (
        sender &&
        sender.trim().toLowerCase() === "you"
    ) {

        return "you";

    }


    return "contact";
}


// ============================================================
// GET RECENT MESSAGES
// ============================================================
//
// This is the important scanning mechanism.
//
// It reads the latest 20 WhatsApp messages from the
// currently open conversation.
//
// ============================================================

function getRecentMessages(limit = 20) {

    const containers =
        getMessageContainers();


    const messages = [];


    // --------------------------------------------------------
    // TAKE ONLY LAST 20
    // --------------------------------------------------------

    const recent =
        containers.slice(-limit);


    // --------------------------------------------------------
    // Used when WhatsApp doesn't expose sender on
    // consecutive messages.
    // --------------------------------------------------------

    let previousSender = null;


    for (const container of recent) {

        const text =
            getMessageText(container);


        // Ignore containers without text
        if (!text) {
            continue;
        }


        let sender =
            getSender(container);


        // ----------------------------------------------------
        // WhatsApp sometimes doesn't expose sender on every
        // consecutive message.
        // ----------------------------------------------------

        if (
            sender === "Unknown" &&
            previousSender
        ) {

            sender =
                previousSender;

        }


        if (
            sender &&
            sender !== "Unknown"
        ) {

            previousSender =
                sender;

        }


        const senderType =
            getSenderType(sender);


        messages.push({

            sender: sender,

            senderType: senderType,

            text: text

        });

    }


    return messages;
}


// ============================================================
// GET LATEST MESSAGE
// ============================================================

function getLatestMessage() {

    const messages =
        getRecentMessages(20);


    if (!messages.length) {
        return null;
    }


    return messages[
        messages.length - 1
    ];
}


// ============================================================
// ANALYZE CURRENT CHAT
// ============================================================
//
// IMPORTANT:
// There is NO direct fetch() from WhatsApp here.
//
// The scanned messages are sent to background.js.
// background.js talks to FastAPI.
//
// ============================================================

async function analyzeCurrentChat() {

    if (isAnalyzing) {
        return;
    }


    isAnalyzing = true;


    const launcher =
        document.getElementById(
            "persona-ai-launcher"
        );


    if (launcher) {

        launcher.disabled = true;

        launcher.innerHTML =
            "⏳ Analyzing...";

    }


    try {

        // ====================================================
        // GET CONTACT
        // ====================================================

        const contact =
            getCurrentContact();


        console.log(
            "👤 Persona AI contact:",
            contact
        );


        // ====================================================
        // SCAN LAST 20 MESSAGES
        // ====================================================

        const messages =
            getRecentMessages(20);


        console.log(
            "🔎 Persona AI scanned:",
            messages.length,
            "messages"
        );


        console.log(
            "📋 Conversation:",
            messages
        );


        // ====================================================
        // NO MESSAGES
        // ====================================================

        if (!messages.length) {

            showToast(
                "No messages found in this chat."
            );

            return;

        }


        // ====================================================
        // GET LATEST MESSAGE
        // ====================================================

        const latest =
            messages[
                messages.length - 1
            ];


        console.log(
            "📩 Latest message:",
            latest
        );


        // ====================================================
        // DON'T REPLY TO OUR OWN MESSAGE
        // ====================================================

        if (
            latest.senderType === "you"
        ) {

            showToast(
                "Latest message is yours. No reply needed."
            );

            return;

        }


        // ====================================================
        // SHOW LOADING
        // ====================================================

        showLoadingCard();


        // ====================================================
        // SEND TO BACKGROUND SERVICE WORKER
        // ====================================================

        console.log(
            "📤 Sending scanned chat to background..."
        );


        const result =
            await sendChatToBackground(
                contact,
                messages
            );


        console.log(
            "🤖 Persona AI result:",
            result
        );


        // ====================================================
        // CHECK RESULT
        // ====================================================

        if (!result) {

            throw new Error(
                "No response received from backend."
            );

        }


        // ====================================================
        // SHOW REPLY SUGGESTIONS
        // ====================================================

        const suggestions =
            result
                ?.analysis
                ?.reply_suggestions;


        if (
            result.needs_reply &&
            Array.isArray(suggestions) &&
            suggestions.length > 0
        ) {

            showPersonaAssistant(
                result
            );

        }
        else {

            removePersonaCard();

            showToast(
                "No reply suggestions generated."
            );

        }

    }
    catch (error) {

        console.error(
            "❌ Persona AI error:",
            error
        );


        showErrorCard(
            error.message
        );

    }
    finally {

        isAnalyzing = false;


        if (launcher) {

            launcher.disabled = false;

            launcher.innerHTML =
                "🤖 Persona AI";

        }

    }
}


// ============================================================
// SEND CHAT TO BACKGROUND.JS
// ============================================================

function sendChatToBackground(
    contact,
    messages
) {

    return new Promise(
        (resolve, reject) => {

            chrome.runtime.sendMessage(

                {

                    action:
                        "analyzeChat",

                    contact:
                        contact,

                    messages:
                        messages

                },

                (response) => {

                    // ------------------------------------------------
                    // Chrome runtime error
                    // ------------------------------------------------

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


                    // ------------------------------------------------
                    // No response
                    // ------------------------------------------------

                    if (!response) {

                        reject(
                            new Error(
                                "No response from Persona AI background service."
                            )
                        );

                        return;

                    }


                    // ------------------------------------------------
                    // Background reported failure
                    // ------------------------------------------------

                    if (!response.success) {

                        reject(
                            new Error(
                                response.error ||
                                "Backend analysis failed."
                            )
                        );

                        return;

                    }


                    // ------------------------------------------------
                    // SUCCESS
                    // ------------------------------------------------

                    resolve(
                        response.result
                    );

                }

            );

        }
    );
}


// ============================================================
// CREATE FLOATING PERSONA AI BUTTON
// ============================================================

function createPersonaButton() {

    // Prevent duplicates
    if (
        document.getElementById(
            "persona-ai-launcher"
        )
    ) {

        return;

    }


    const button =
        document.createElement("button");


    button.id =
        "persona-ai-launcher";


    button.innerHTML =
        "🤖 Persona AI";


    button.title =
        "Analyze the current WhatsApp conversation";


    // ========================================================
    // BUTTON STYLE
    // ========================================================

    Object.assign(
        button.style,
        {

            position:
                "fixed",

            right:
                "20px",

            bottom:
                "90px",

            zIndex:
                "999999",

            padding:
                "12px 18px",

            border:
                "none",

            borderRadius:
                "24px",

            background:
                "linear-gradient(135deg, #667eea, #764ba2)",

            color:
                "white",

            fontSize:
                "14px",

            fontWeight:
                "600",

            cursor:
                "pointer",

            boxShadow:
                "0 6px 20px rgba(0,0,0,0.25)",

            transition:
                "transform 0.2s ease"

        }
    );


    // ========================================================
    // HOVER
    // ========================================================

    button.addEventListener(
        "mouseenter",
        () => {

            button.style.transform =
                "scale(1.05)";

        }
    );


    button.addEventListener(
        "mouseleave",
        () => {

            button.style.transform =
                "scale(1)";

        }
    );


    // ========================================================
    // CLICK
    // ========================================================

    button.addEventListener(
        "click",
        () => {

            console.log(
                "🤖 Persona AI button clicked"
            );


            analyzeCurrentChat();

        }
    );


    document.body.appendChild(
        button
    );


    console.log(
        "✅ Persona AI floating button created"
    );
}


// ============================================================
// LOADING CARD
// ============================================================

function showLoadingCard() {

    removePersonaCard();


    const card =
        document.createElement("div");


    card.id =
        "persona-ai-card";


    Object.assign(
        card.style,
        getCardStyle()
    );


    card.innerHTML = `

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:12px;
        ">

            <strong style="
                font-size:16px;
            ">
                🤖 Persona AI
            </strong>

            <button
                id="persona-close-loading"
                style="
                    border:none;
                    background:none;
                    font-size:20px;
                    cursor:pointer;
                    color:#666;
                "
            >
                ×
            </button>

        </div>


        <div style="
            padding:16px 4px;
            text-align:center;
            color:#666;
        ">

            <div style="
                font-size:28px;
                margin-bottom:8px;
            ">
                ✨
            </div>

            Understanding conversation...

        </div>

    `;


    document.body.appendChild(
        card
    );


    const closeButton =
        document.getElementById(
            "persona-close-loading"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            removePersonaCard
        );

    }
}


// ============================================================
// SHOW PERSONA AI REPLY CARD
// ============================================================

function showPersonaAssistant(result) {

    removePersonaCard();


    const suggestions =
        result
            ?.analysis
            ?.reply_suggestions ||
        [];


    if (!suggestions.length) {

        return;

    }


    const card =
        document.createElement("div");


    card.id =
        "persona-ai-card";


    Object.assign(
        card.style,
        getCardStyle()
    );


    // ========================================================
    // HEADER
    // ========================================================

    const header =
        document.createElement("div");


    Object.assign(
        header.style,
        {

            display:
                "flex",

            justifyContent:
                "space-between",

            alignItems:
                "center",

            marginBottom:
                "10px"

        }
    );


    const title =
        document.createElement("strong");


    title.innerText =
        "🤖 Persona AI";


    title.style.fontSize =
        "16px";


    const close =
        document.createElement("button");


    close.innerText =
        "×";


    Object.assign(
        close.style,
        {

            border:
                "none",

            background:
                "transparent",

            fontSize:
                "20px",

            cursor:
                "pointer",

            color:
                "#666"

        }
    );


    close.onclick =
        removePersonaCard;


    header.appendChild(
        title
    );


    header.appendChild(
        close
    );


    card.appendChild(
        header
    );


    // ========================================================
    // SUBTITLE
    // ========================================================

    const subtitle =
        document.createElement("div");


    subtitle.innerText =
        "3 reply suggestions";


    Object.assign(
        subtitle.style,
        {

            fontSize:
                "12px",

            color:
                "#777",

            marginBottom:
                "10px"

        }
    );


    card.appendChild(
        subtitle
    );


    // ========================================================
    // REPLY BUTTONS
    // ========================================================

    suggestions
        .slice(0, 3)
        .forEach(
            (reply, index) => {

                const replyButton =
                    document.createElement(
                        "button"
                    );


                replyButton.innerText =
                    reply;


                Object.assign(
                    replyButton.style,
                    {

                        display:
                            "block",

                        width:
                            "100%",

                        marginBottom:
                            "8px",

                        padding:
                            "11px",

                        border:
                            "1px solid #ddd",

                        borderRadius:
                            "10px",

                        background:
                            "#f8f8f8",

                        color:
                            "#222",

                        textAlign:
                            "left",

                        fontSize:
                            "13px",

                        lineHeight:
                            "1.4",

                        cursor:
                            "pointer"

                    }
                );


                // ------------------------------------------------
                // HOVER
                // ------------------------------------------------

                replyButton.addEventListener(
                    "mouseenter",
                    () => {

                        replyButton.style.background =
                            "#eeeeff";

                    }
                );


                replyButton.addEventListener(
                    "mouseleave",
                    () => {

                        replyButton.style.background =
                            "#f8f8f8";

                    }
                );


                // ------------------------------------------------
                // CLICK REPLY
                // ------------------------------------------------

                replyButton.addEventListener(
                    "click",
                    () => {

                        console.log(
                            "✍️ Selected reply:",
                            reply
                        );


                        insertReplyIntoWhatsApp(
                            reply
                        );

                    }
                );


                card.appendChild(
                    replyButton
                );

            }
        );


    // ========================================================
    // FOOTER
    // ========================================================

    const footer =
        document.createElement("div");


    footer.innerText =
        "Click a suggestion to insert it into WhatsApp.";


    Object.assign(
        footer.style,
        {

            marginTop:
                "6px",

            fontSize:
                "10px",

            color:
                "#999",

            textAlign:
                "center"

        }
    );


    card.appendChild(
        footer
    );


    document.body.appendChild(
        card
    );
}


// ============================================================
// CARD STYLE
// ============================================================

function getCardStyle() {

    return {

        position:
            "fixed",

        right:
            "20px",

        bottom:
            "145px",

        width:
            "320px",

        maxWidth:
            "calc(100vw - 40px)",

        zIndex:
            "999999",

        background:
            "white",

        borderRadius:
            "14px",

        padding:
            "16px",

        boxShadow:
            "0 10px 35px rgba(0,0,0,0.25)",

        border:
            "1px solid #e5e5e5",

        fontFamily:
            "Arial, sans-serif",

        color:
            "#222"

    };
}


// ============================================================
// INSERT REPLY INTO WHATSAPP
// ============================================================

function insertReplyIntoWhatsApp(reply) {

    console.log(
        "✍️ Inserting reply:",
        reply
    );


    // ========================================================
    // FIND WHATSAPP COMPOSER
    // ========================================================

    const selectors = [

        'div[contenteditable="true"][data-tab="10"]',

        'div[contenteditable="true"][role="textbox"]',

        'div[contenteditable="true"][aria-label*="message"]',

        'div[contenteditable="true"][title*="message"]',

        'footer div[contenteditable="true"]'

    ];


    let composer = null;


    for (
        const selector of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (element) {

            composer =
                element;

            break;

        }

    }


    // ========================================================
    // COMPOSER NOT FOUND
    // ========================================================

    if (!composer) {

        showToast(
            "Could not find WhatsApp message box."
        );


        console.error(
            "❌ WhatsApp composer not found"
        );


        return;

    }


    // ========================================================
    // FOCUS
    // ========================================================

    composer.focus();


    // ========================================================
    // CLEAR
    // ========================================================

    composer.innerHTML =
        "";


    // ========================================================
    // INSERT TEXT
    // ========================================================

    const textNode =
        document.createTextNode(
            reply
        );


    composer.appendChild(
        textNode
    );


    // ========================================================
    // INPUT EVENT
    // ========================================================

    composer.dispatchEvent(
        new InputEvent(
            "input",
            {

                bubbles:
                    true,

                inputType:
                    "insertText",

                data:
                    reply

            }
        )
    );


    // ========================================================
    // CHANGE EVENT
    // ========================================================

    composer.dispatchEvent(
        new Event(
            "change",
            {
                bubbles:
                    true
            }
        )
    );


    console.log(
        "✅ Reply inserted into WhatsApp"
    );


    // ========================================================
    // CLOSE CARD
    // ========================================================

    removePersonaCard();


    showToast(
        "Reply inserted. Press Send in WhatsApp."
    );
}


// ============================================================
// REMOVE PERSONA CARD
// ============================================================

function removePersonaCard() {

    const card =
        document.getElementById(
            "persona-ai-card"
        );


    if (card) {

        card.remove();

    }
}


// ============================================================
// TOAST
// ============================================================

function showToast(message) {

    const existing =
        document.getElementById(
            "persona-ai-toast"
        );


    if (existing) {

        existing.remove();

    }


    const toast =
        document.createElement("div");


    toast.id =
        "persona-ai-toast";


    toast.innerText =
        message;


    Object.assign(
        toast.style,
        {

            position:
                "fixed",

            right:
                "20px",

            bottom:
                "60px",

            zIndex:
                "1000000",

            background:
                "#222",

            color:
                "white",

            padding:
                "10px 15px",

            borderRadius:
                "8px",

            fontSize:
                "13px",

            boxShadow:
                "0 4px 15px rgba(0,0,0,0.25)"

        }
    );


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            if (toast) {

                toast.remove();

            }

        },
        3000
    );
}


// ============================================================
// ERROR CARD
// ============================================================

function showErrorCard(error) {

    removePersonaCard();


    const card =
        document.createElement("div");


    card.id =
        "persona-ai-card";


    Object.assign(
        card.style,
        getCardStyle()
    );


    card.innerHTML = `

        <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
        ">

            <strong>
                🤖 Persona AI
            </strong>

            <button
                id="persona-error-close"
                style="
                    border:none;
                    background:none;
                    font-size:20px;
                    cursor:pointer;
                "
            >
                ×
            </button>

        </div>


        <div style="
            margin-top:12px;
            color:#c62828;
            font-size:13px;
        ">
            ❌ Unable to generate reply.
        </div>


        <div style="
            margin-top:8px;
            color:#777;
            font-size:11px;
            word-break:break-word;
        ">
            ${escapeHtml(error)}
        </div>

    `;


    document.body.appendChild(
        card
    );


    const close =
        document.getElementById(
            "persona-error-close"
        );


    if (close) {

        close.addEventListener(
            "click",
            removePersonaCard
        );

    }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");


    div.textContent =
        String(text);


    return div.innerHTML;
}


// ============================================================
// EXTENSION MESSAGE HANDLERS
// ============================================================
//
// This preserves the old Scan Chat mechanism.
//
// popup.js can still send:
//     { action: "scanChat" }
//
// and receive the latest 20 messages.
//
// ============================================================

chrome.runtime.onMessage.addListener(
    (
        request,
        sender,
        sendResponse
    ) => {

        // ====================================================
        // SCAN CHAT
        // ====================================================

        if (
            request.action ===
            "scanChat"
        ) {

            console.log(
                "🔎 Scan Chat requested"
            );


            const contact =
                getCurrentContact();


            const messages =
                getRecentMessages(20);


            console.log(
                "📋 Scan Chat:",
                contact,
                messages
            );


            sendResponse({

                success:
                    true,

                contact:
                    contact,

                messages:
                    messages,

                hasMore:
                    false

            });


            return true;
        }


        // ====================================================
        // INSERT REPLY
        // ====================================================

        if (
            request.action ===
            "insertReply"
        ) {

            insertReplyIntoWhatsApp(
                request.reply
            );


            sendResponse({

                success:
                    true

            });


            return true;
        }


        // ====================================================
        // LOAD OLDER MESSAGES
        // ====================================================

        if (
            request.action ===
            "loadOlderMessages"
        ) {

            const messages =
                getRecentMessages(40);


            sendResponse({

                success:
                    true,

                messages:
                    messages,

                hasMore:
                    false

            });


            return true;
        }

    }
);


// ============================================================
// INITIALIZATION
// ============================================================
//
// NO MutationObserver.
// NO automatic message detection.
// NO polling.
//
// The user clicks Persona AI when they want analysis.
//
// ============================================================

function initializePersonaAI() {

    console.log(
        "🚀 Persona AI initialized"
    );


    createPersonaButton();


    // --------------------------------------------------------
    // WhatsApp can rebuild parts of its DOM.
    // Keep the button available.
    // --------------------------------------------------------

    setInterval(
        () => {

            if (
                !document.getElementById(
                    "persona-ai-launcher"
                )
            ) {

                createPersonaButton();

            }

        },
        2000
    );
}


// ============================================================
// START
// ============================================================

setTimeout(
    initializePersonaAI,
    2500
);