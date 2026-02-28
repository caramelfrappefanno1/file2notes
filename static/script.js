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

    try {
        if (currentMode === "file") {
            const fileInput = document.getElementById("fileInput");

            if (!fileInput.files.length) {
                alert("Please select a file.");
                container.innerHTML = "";
                return;
            }

            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            const response = await fetch("/quizgen", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                showErrorPopup(data.error || "Server error occurred.");
                container.innerHTML = "";
                return;
            }

            displayQuiz(data);
        } 
        
        else if (currentMode === "link") {
            let link = document.getElementById("linkInput").value.trim();

            if (!link) {
                alert("Please enter a URL.");
                container.innerHTML = "";
                return;
            }

            // Auto-add https:// if missing
            if (!link.startsWith("http://") && !link.startsWith("https://")) {
                link = "https://" + link;
            }

            const response = await fetch("/quizgen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link: link })
            });

            const data = await response.json();

            if (!response.ok) {
                container.innerHTML = `<p class="incorrect">${data.error || "Error generating quiz."}</p>`;
                return;
            }

            displayQuiz(data);
        }

    } catch (err) {
    console.error(err);
    showErrorPopup("Network error. Please check your internet connection.");
}
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

    const list = document.getElementById("historyList");
    list.innerHTML = "";

    if (!history.length) {
        list.innerHTML = "<p>No past quizzes yet.</p>";
        return;
    }

    history.slice().reverse().forEach((quiz, i) => {
        const div = document.createElement("div");
        div.className = "history-item";

        div.innerHTML = `
            <strong>Quiz ${history.length - i}</strong>
            <p style="font-size:12px;">${quiz.timestamp}</p>
        `;

        const btn = document.createElement("button");
        btn.className = "generate-btn";
        btn.textContent = "Open Quiz";
        btn.onclick = () => {
            displayQuiz(quiz);
            toggleHistory(); // auto close drawer
        };

        div.appendChild(btn);
        list.appendChild(div);
    });
}

function toggleHistory() {
    const panel = document.getElementById("historyPanel");
    panel.classList.toggle("open");

    if (panel.classList.contains("open")) {
        loadHistory();
    }
}