function inspectWhatsApp() {

    console.clear();

    console.log("========== PERSONA AI DOM INSPECTOR ==========");

    // Contact Name
    const contact = document.querySelector("header span[title]");

    console.log("Contact:", contact ? contact.title : "Not Found");

    // Every message bubble
    const msgs = document.querySelectorAll("div[data-testid='msg-container']");

    console.log("Messages Found:", msgs.length);

    msgs.forEach((msg, index) => {

        console.log("----------------");

        console.log(index);

        console.log(msg.innerText);

        console.log(msg);

    });

}

inspectWhatsApp();