document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');

    const API_URL = 'http://localhost:5000/api/chat';

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        addMessage(message, 'user');
        userInput.value = '';
        userInput.disabled = true;
        sendBtn.disabled = true;

        showTypingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            removeTypingIndicator();

            if (data.success) {
                addMessage(data.response, 'bot');
            } else {
                addMessage(data.response || 'Sorry, I encountered an error. Please try again.', 'bot');
            }

        } catch (error) {
            removeTypingIndicator();
            addMessage('Sorry, the chatbot service is currently unavailable. Please try again later.', 'bot');
            console.error('Chatbot error:', error);
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-content">
                <span>AI is thinking</span>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    addMessage('Hello! I am your AI Legal Assistant. I can help you with legal queries, case information, IPC sections, and legal procedures. How can I assist you today?', 'bot');

    // ===== Voice recognition (Web Speech API) =====
    let recognition;
    let isRecording = false;

    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (window.SpeechRecognition) {
        recognition = new window.SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join(' ')
                .trim();

            if (transcript) {
                // Just put the transcript into input field, DO NOT send automatically
                userInput.value = transcript;
                userInput.focus();
            }
        };

        recognition.onstart = () => {
            const vs = document.getElementById('voiceStatus');
            if (vs) vs.innerText = '🎙 Listening...';
            const btn = document.getElementById('startVoiceBtn');
            if (btn) {
                btn.innerText = '⏹ Stop';
                btn.classList.add('recording');
            }
            isRecording = true;
        };

        recognition.onend = () => {
            const vs = document.getElementById('voiceStatus');
            if (vs) vs.innerText = '';
            const btn = document.getElementById('startVoiceBtn');
            if (btn) {
                btn.innerText = '🎤';
                btn.classList.remove('recording');
            }
            isRecording = false;
        };

        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e);
            const vs = document.getElementById('voiceStatus');
            if (vs) vs.innerText = 'Microphone error: ' + (e.error || 'unknown');
            const btn = document.getElementById('startVoiceBtn');
            if (btn) {
                btn.innerText = '🎤';
                btn.classList.remove('recording');
            }
            isRecording = false;
        };

        const startBtn = document.getElementById('startVoiceBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (!isRecording) {
                    try {
                        recognition.start();
                    } catch (err) {
                        console.error('Recognition start failed:', err);
                        const vs = document.getElementById('voiceStatus');
                        if (vs) vs.innerText = 'Microphone start failed';
                    }
                } else {
                    recognition.stop();
                }
            });
        }
    } else {
        const vs = document.getElementById('voiceStatus');
        if (vs) vs.innerText = '❌ Voice input not supported in this browser.';
        const startBtn = document.getElementById('startVoiceBtn');
        if (startBtn) startBtn.disabled = true;
    }
});
