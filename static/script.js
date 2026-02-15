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
        textContent = await fileInput.files[0].text();
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
    data.questions.forEach((q, index) => {
        const selected = document.querySelector(`input[name="q${index}"]:checked`);
        const feedbackDiv = document.getElementById(`feedback-${index}`);
        
        if (!selected) {
            feedbackDiv.innerHTML = `<p class="incorrect">No answer selected</p>`;
            return;
        }

        const selectedIndex = parseInt(selected.value);

        // Match keys with app.py: 'answer' and 'choices'
        if (selectedIndex === q.answer) {
            feedbackDiv.innerHTML = `
                <p class="correct">Correct!</p>
                <div class="explanation">${q.explanation}</div>
            `;
        } else {
            feedbackDiv.innerHTML = `
                <p class="incorrect">Incorrect. Correct answer: ${q.choices[q.answer]}</p>
                <div class="explanation">${q.explanation}</div>
            `;
        }
    });
}