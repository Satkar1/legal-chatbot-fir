// Tab Handler for Citizen Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
});

function initializeTabs() {
    // Set default active tab
    showChatBot();
    
    // Add event listeners to sidebar buttons
    document.getElementById('chatbotTab').addEventListener('click', showChatBot);
    document.getElementById('quizTab').addEventListener('click', showLegalQuiz);
    document.getElementById('rightsTab').addEventListener('click', showRightsExplorer);
    document.getElementById('scenarioTab').addEventListener('click', showScenarioGame);
    document.getElementById('ipcTab').addEventListener('click', showIPCSimulator);
    document.getElementById('documentTab').addEventListener('click', showDocumentHelper);
    document.getElementById('calculatorTab').addEventListener('click', showLegalCalculator);
}

function showChatBot() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <i class="material-icons">chat</i>
                <span>AI Legal Assistant</span>
            </div>
            
            <div class="chat-messages" id="chatMessages">
                <div class="message bot-message">
                    Hello! I am your AI Legal Assistant. How can I help you today?
                </div>
            </div>
            
            <div class="chat-input-container">
                <input type="text" class="chat-input" id="userInput" placeholder="Type your legal question here...">
                <button class="send-btn" id="sendBtn">
                    <i class="material-icons">send</i>
                </button>
            </div>
        </div>
    `;
    
    updateSidebarActiveState('chatbotTab');
    
    // Reinitialize the chatbot functionality from chatbot.js
    initializeChatBot();
}

function initializeChatBot() {
    // This will use the existing chatbot.js functionality
    // The DOMContentLoaded event in chatbot.js will handle the initialization
    // We just need to make sure the elements exist
    console.log("Chatbot initialized");
}

function showLegalQuiz() {
    legalQuiz.showQuiz();
    updateSidebarActiveState('quizTab');
}

function showRightsExplorer() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="feature-coming-soon">
            <i class="material-icons">account_balance</i>
            <h2>Know Your Rights</h2>
            <p>This feature is coming soon! Learn about your fundamental rights and legal protections.</p>
            <div class="feature-preview">
                <p>🔒 Interactive rights explorer</p>
                <p>📚 Fundamental rights guide</p>
                <p>⚖️ Legal protections overview</p>
            </div>
        </div>
    `;
    updateSidebarActiveState('rightsTab');
}

function showScenarioGame() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="feature-coming-soon">
            <i class="material-icons">casino</i>
            <h2>Legal Scenarios</h2>
            <p>This feature is coming soon! Practice with real-life legal scenarios and learn how to respond.</p>
            <div class="feature-preview">
                <p>🎯 Choose-your-own-adventure scenarios</p>
                <p>📝 Real-life legal situations</p>
                <p>💡 Expert guidance and explanations</p>
            </div>
        </div>
    `;
    updateSidebarActiveState('scenarioTab');
}

function showIPCSimulator() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="feature-coming-soon">
            <i class="material-icons">article</i>
            <h2>IPC Explorer</h2>
            <p>This feature is coming soon! Explore Indian Penal Code sections with interactive examples.</p>
            <div class="feature-preview">
                <p>📖 IPC section browser</p>
                <p>🔍 Search and filter sections</p>
                <p>📚 Case examples and explanations</p>
            </div>
        </div>
    `;
    updateSidebarActiveState('ipcTab');
}

function showDocumentHelper() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="feature-coming-soon">
            <i class="material-icons">description</i>
            <h2>Document Helper</h2>
            <p>This feature is coming soon! Get help with legal documents and templates.</p>
            <div class="feature-preview">
                <p>📄 Legal document templates</p>
                <p>✍️ Guided form filling</p>
                <p>📑 Document checklist</p>
            </div>
        </div>
    `;
    updateSidebarActiveState('documentTab');
}

function showLegalCalculator() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <div class="feature-coming-soon">
            <i class="material-icons">calculate</i>
            <h2>Legal Calculators</h2>
            <p>This feature is coming soon! Calculate legal timelines, fines, and other legal metrics.</p>
            <div class="feature-preview">
                <p>⏰ Legal timeline calculator</p>
                <p>💰 Fine and compensation estimator</p>
                <p>📅 Court date calculator</p>
            </div>
        </div>
    `;
    updateSidebarActiveState('calculatorTab');
}

function updateSidebarActiveState(activeTabId) {
    // Remove active class from all buttons
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
    });
    
    // Add active class to clicked button
    const activeBtn = document.getElementById(activeTabId);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}