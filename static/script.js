let currentMode = "file";

function setMode(mode, btn) {
    currentMode = mode;
    document.getElementById("fileMode").style.display = mode === "file" ? "block" : "none";
    document.getElementById("linkMode").style.display = mode === "link" ? "block" : "none";
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

async function generateQuiz() {
    const container = document.getElementById("quizContainer");
    container.innerHTML = "<p>Generating quiz... please wait.</p>";

    let textContent = "";
    let link = "";

    if (currentMode === "file") {
        const fileInput = document.getElementById("fileInput");
        if (!fileInput.files.length) {
            alert("Please select a file.");
            return;
        }
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        const response = await fetch("/quizgen", {
            method: "POST",
            body: formData
        });

        const quizData = await response.json();
        displayQuiz(quizData);
        return;
    } else {
        link = document.getElementById("linkInput").value;
        if (!link) {
            alert("Please enter a URL.");
            return;
        }
    }

    const quizData = await sendToAI(textContent, link);
    displayQuiz(quizData);
}

async function sendToAI(text, link) {
    const response = await fetch("/quizgen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, link })
    });
    return await response.json();
}

function displayQuiz(data) {
    const container = document.getElementById("quizContainer");
    container.innerHTML = "";

    if (!data.questions || !Array.isArray(data.questions)) {
        container.innerHTML = "<p class='incorrect'>Error generating quiz. Please try again.</p>";
        return;
    }

    // FIXED: Only one loop to create questions
    data.questions.forEach((q, index) => {
        const div = document.createElement("div");
        div.classList.add("question");

        // Use 'choices' to match the AI prompt in app.py
        div.innerHTML = `
            <p><strong>Q${index + 1}:</strong> ${q.question}</p>
            ${q.choices.map((opt, i) => `
                <label>
                    <input type="radio" name="q${index}" value="${i}">
                    ${opt}
                </label><br>
            `).join("")}
            <div id="feedback-${index}"></div>
        `;
        container.appendChild(div);
    });

    const submitBtn = document.createElement("button");
    submitBtn.className = "generate-btn";
    submitBtn.textContent = "Submit Quiz";
    submitBtn.onclick = () => checkAnswers(data);
    container.appendChild(submitBtn);
}

function checkAnswers(data) {
    let correctCount = 0;
    let weakText = [];

    data.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const feedbackDiv = document.getElementById(`feedback-${index}`);
        
        if (!selected) {
            feedbackDiv.innerHTML = `<p class="incorrect">No answer selected</p>`;
            weakText.push(q.question + " " + q.explanation);
            return;
        }

        const selectedIndex = parseInt(selected.value);

        if (selectedIndex === q.answer) {
            correctCount++;
            feedbackDiv.innerHTML = `
                <p class="correct">Correct!</p>
                <div class="explanation">${q.explanation}</div>
            `;
        } else {
            feedbackDiv.innerHTML = `
                <p class="incorrect">Incorrect. Correct answer: ${q.choices[q.answer]}</p>
                <div class="explanation">${q.explanation}</div>
            `;
            weakText.push(q.question + " " + q.explanation);
        }
    });

    const scorePercent = Math.round((correctCount / data.questions.length) * 100);

    const container = document.getElementById("quizContainer");

    const resultDiv = document.createElement("div");
    resultDiv.className = "question";
    resultDiv.innerHTML = `
        <h3>Your Score: ${correctCount} / ${data.questions.length} (${scorePercent}%)</h3>
    `;
    container.appendChild(resultDiv);

    // Only show retest option if user got something wrong
    if (weakText.length > 0) {
        const promptDiv = document.createElement("div");
        promptDiv.className = "question";
        promptDiv.innerHTML = `
            <p><strong>Would you like another test focused on your weak areas?</strong></p>
            <button class="generate-btn" id="yesRetry">Yes</button>
            <button class="mode-btn" id="noRetry">No</button>
        `;
        container.appendChild(promptDiv);

        document.getElementById("yesRetry").onclick = () => {
            generateWeakQuiz(weakText.join(" "));
        };

        document.getElementById("noRetry").onclick = () => {
            promptDiv.innerHTML = "<p>Great job! Keep studying!</p>";
        };
    }
}

async function generateWeakQuiz(weakContent) {
    const container = document.getElementById("quizContainer");
    container.innerHTML = "<p>Generating new quiz based on weak areas...</p>";

    const quizData = await sendToAI(weakContent, "");
    displayQuiz(quizData);
}

async function loadHistory() {
    const response = await fetch("/history");
    const history = await response.json();

    const container = document.getElementById("quizContainer");
    container.innerHTML = "<h2>Quiz History</h2>";

    history.reverse().forEach((quiz, i) => {
        const div = document.createElement("div");
        div.classList.add("question");

        div.innerHTML = `
            <p><strong>Quiz ${history.length - i}</strong></p>
            <p><em>${quiz.timestamp}</em></p>
            <button onclick='displayQuiz(${JSON.stringify(quiz)})'>
                Open Quiz
            </button>
        `;

        container.appendChild(div);
    });
}