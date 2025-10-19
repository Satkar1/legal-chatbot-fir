// Legal Quiz Game Implementation
class LegalQuizGame {
    constructor() {
        this.questions = [
            {
                id: 1,
                question: "What is the punishment for theft under IPC Section 379?",
                options: [
                    "Fine only",
                    "Up to 3 years imprisonment or fine or both",
                    "Life imprisonment", 
                    "No imprisonment"
                ],
                correct: 1,
                explanation: "IPC Section 379: Theft is punishable with imprisonment of up to 3 years, or with fine, or with both.",
                category: "IPC"
            },
            {
                id: 2,
                question: "What is the right to free legal aid guaranteed under?",
                options: [
                    "Article 21 of Constitution",
                    "Article 19 of Constitution", 
                    "Article 32 of Constitution",
                    "Article 14 of Constitution"
                ],
                correct: 0,
                explanation: "Article 21 (Right to Life and Personal Liberty) includes the right to free legal aid for those who cannot afford it.",
                category: "Constitutional Law"
            },
            {
                id: 3,
                question: "What is the time limit for filing an FIR?",
                options: [
                    "No time limit",
                    "Within 24 hours",
                    "Within 1 week",
                    "Within 1 month"
                ],
                correct: 0,
                explanation: "There is no statutory time limit for filing an FIR. However, delay may require explanation.",
                category: "Criminal Procedure"
            },
            {
                id: 4,
                question: "Which article provides the Right to Education as a fundamental right?",
                options: [
                    "Article 21A",
                    "Article 45",
                    "Article 51A",
                    "Article 38"
                ],
                correct: 0,
                explanation: "Article 21A: The State shall provide free and compulsory education to all children of 6 to 14 years.",
                category: "Constitutional Law"
            },
            {
                id: 5,
                question: "What is 'bail' in legal terms?",
                options: [
                    "Permanent release from custody",
                    "Temporary release until trial",
                    "Reduction of punishment",
                    "Suspension of case"
                ],
                correct: 1,
                explanation: "Bail is the temporary release of an accused person awaiting trial, sometimes with conditions.",
                category: "Criminal Law"
            }
        ];
        
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswers = [];
    }

    showQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswers = [];
        
        // Target only the legal quiz tab container so other tabs stay intact
        const quizContainer = document.getElementById('legalQuizTab');
        if (quizContainer) {
            quizContainer.innerHTML = this.createQuizHTML();
        }

        this.displayQuestion();
    }

    createQuizHTML() {
        return `
            <div class="quiz-container" style="background: white; border-radius: 12px; padding: 2rem; margin: 1rem 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div class="quiz-header" style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="color: #2c3e50; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <i class="material-icons">quiz</i> Legal Knowledge Quiz
                    </h2>
                    <p style="color: #7f8c8d;">Test your legal knowledge with these important questions!</p>
                </div>
                
                <div class="quiz-stats" style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 2rem;">
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #3498db; color: white; border-radius: 8px;">
                        <span class="stat-number" id="currentQuestion" style="display: block; font-size: 2rem; font-weight: bold;">1</span>
                        <span class="stat-label" style="font-size: 0.9rem;">Question</span>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #3498db; color: white; border-radius: 8px;">
                        <span class="stat-number" id="totalQuestions" style="display: block; font-size: 2rem; font-weight: bold;">${this.questions.length}</span>
                        <span class="stat-label" style="font-size: 0.9rem;">Total</span>
                    </div>
                    <div class="stat-card" style="text-align: center; padding: 1rem; background: #3498db; color: white; border-radius: 8px;">
                        <span class="stat-number" id="currentScore" style="display: block; font-size: 2rem; font-weight: bold;">0</span>
                        <span class="stat-label" style="font-size: 0.9rem;">Score</span>
                    </div>
                </div>

                <div class="quiz-content">
                    <div class="question-card" id="questionCard" style="background: #f8f9fa; padding: 2rem; border-radius: 8px;">
                        <!-- Question will be inserted here -->
                    </div>
                    
                    <div class="quiz-controls" style="display: flex; justify-content: center; gap: 1rem; margin: 2rem 0;">
                        <button class="quiz-btn secondary" onclick="legalQuiz.previousQuestion()" id="prevBtn" disabled 
                                style="padding: 0.75rem 1.5rem; background: #95a5a6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="material-icons">arrow_back</i> Previous
                        </button>
                        <button class="quiz-btn primary" onclick="legalQuiz.nextQuestion()" id="nextBtn"
                                style="padding: 0.75rem 1.5rem; background: #3498db; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            Next <i class="material-icons">arrow_forward</i>
                        </button>
                        <button class="quiz-btn success" onclick="legalQuiz.showResults()" id="submitBtn" style="display: none;"
                                style="padding: 0.75rem 1.5rem; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            <i class="material-icons">check_circle</i> See Results
                        </button>
                    </div>
                </div>

                <div class="quiz-progress" style="margin-top: 2rem;">
                    <div class="progress-bar" style="width: 100%; height: 8px; background: #ecf0f1; border-radius: 4px;">
                        <div class="progress-fill" id="progressFill" style="height: 100%; background: #3498db; width: 20%; border-radius: 4px;"></div>
                    </div>
                    <span class="progress-text" id="progressText" style="text-align: center; color: #7f8c8d;">1/${this.questions.length}</span>
                </div>
            </div>
        `;
    }
}

// Initialize quiz game
const legalQuiz = new LegalQuizGame();