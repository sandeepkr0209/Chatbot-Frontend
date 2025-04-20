document.addEventListener("DOMContentLoaded", function () {
    let greetingShown = false;
    const chatBox = document.getElementById("chat-box");
    const userMessageInput = document.getElementById("user-message");
    const sendButton = document.getElementById("send-btn");
    const micButton = document.getElementById("mic-btn");
    const attachButton = document.querySelector(".attach-btn");
    const newChatButton = document.querySelector(".new-chat-btn");
    let recognition;
    let recognitionIsActive = false;

    const userId = "Patient1";

    fetchGreeting();

    sendButton.addEventListener("click", handleUserMessage);
    userMessageInput.addEventListener("keypress", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleUserMessage();
        }
    });

    micButton.addEventListener("click", handleMicInput);
    attachButton.addEventListener("click", handleFileAttachment);
    newChatButton.addEventListener("click", startNewChat);

    setupSpeechRecognition();

    async function fetchGreeting() {
        try {
            const response = await fetch("http://127.0.0.1:5000/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, message: "" })
            });
            const data = await response.json();
            addMessage(data.bot_message, "bot");
        } catch (error) {
            console.error("Error fetching greeting:", error);
            addMessage("Hello! How can I assist you today?", "bot");
        }
    }

    async function handleUserMessage() {
        const userText = userMessageInput.value.trim();
        if (!userText) return;

        addMessage(userText, "user");
        userMessageInput.value = "";

        const typingIndicator = addMessage("Dr. SYNO is typing...", "bot", true);

        try {
            if (navigator.onLine) {
                const response = await fetch("http://127.0.0.1:5000/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId, message: userText })
                });
                const data = await response.json();
                removeMessage(typingIndicator);
                addMessage(data.bot_message, "bot");
                await storeConversation(userId, userText, data.bot_message);
            } else {
                removeMessage(typingIndicator);
                handleOfflineResponse(userText);
            }
        } catch (error) {
            console.error("Error fetching response:", error);
            removeMessage(typingIndicator);
            addMessage("I'm having trouble connecting. Please try again later.", "bot");
        }
    }

    async function storeConversation(userId, userMessage, botMessage) {
        try {
            const response = await fetch("http://127.0.0.1:5000/store_message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    user_message: userMessage,
                    bot_message: botMessage,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Conversation stored:", data);
        } catch (error) {
            console.error("❌ Error storing message:", error);
        }
    }

    function addMessage(text, sender, isTemporary = false) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", sender === "user" ? "user-message" : "bot-message");
        messageDiv.textContent = text;
        chatBox.appendChild(messageDiv);
        messageDiv.style.opacity = "0";
        setTimeout(() => { messageDiv.style.opacity = "1"; }, 100);
        chatBox.scrollTop = chatBox.scrollHeight;
        return isTemporary ? messageDiv : null;
    }

    function removeMessage(messageElement) {
        if (messageElement) messageElement.remove();
    }

    function handleFileAttachment() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.style.display = "none";
        fileInput.addEventListener("change", function () {
            if (fileInput.files.length > 0) {
                addMessage(`📎 ${fileInput.files[0].name}`, "user");
            }
        });
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    function handleMicInput() {
        if (!recognition) return;
        recognitionIsActive ? recognition.stop() : recognition.start();
    }

    function setupSpeechRecognition() {
        if (!("webkitSpeechRecognition" in window)) return;
        recognition = new webkitSpeechRecognition();
        recognition.lang = "en-IN";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onstart = () => updateMicButton(true);
        recognition.onresult = (event) => {
            userMessageInput.value = event.results[0][0].transcript;
            handleUserMessage();
        };
        recognition.onend = () => updateMicButton(false);
        recognition.onerror = (event) => console.error("Speech recognition error:", event.error);
    }

    function updateMicButton(isActive) {
        micButton.style.backgroundColor = isActive ? "#ff4d4d" : "";
        micButton.textContent = isActive ? "🎤 Listening..." : "🎙️ Speak";
    }

    function startNewChat() {
        chatBox.innerHTML = "";
        greetingShown = false;
        fetchGreeting();
    }
});
