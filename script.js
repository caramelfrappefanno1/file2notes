let currentMode = "file";

function setMode(mode, btn) {
    currentMode = mode;

    document.getElementById("fileMode").style.display =
        mode === "file" ? "block" : "none";

    document.getElementById("linkMode").style.display =
        mode === "link" ? "block" : "none";

    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

async function generateQuiz() {
    let textContent = "";

    if (currentMode === "file") {
        const fileInput = document.getElementById("fileInput");
        if (!fileInput.files.length) {
            alert("Please select a file.");
            return;
        }
        textContent = await fileInput.files[0].text();
    }

    if (currentMode === "link") {
        const link = document.getElementById("linkInput").value;
        if (!link) {
            alert("Please enter a URL.");
            return;
        }

        try {
            const response = await fetch(link);
            textContent = await response.text();
        } catch {
            alert("Failed to fetch link.");
            return;
        }
    }

    const quizData = await sendToAI(textContent);
    displayQuiz(quizData);
}

async function sendToAI(text) {
    const response = await fetch("/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });

    return await response.json();
}

function displayQuiz(data) {
    const container = document.getElementById("quizContainer");
    container.innerHTML = "";

    data.questions.forEach((q, index) => {
        const div = document.createElement("div");
        div.classList.add("question");

        div.innerHTML = `
            <p><strong>Q${index + 1}:</strong> ${q.question}</p>
            ${q.options.map((opt, i) => `
                <label>
                    <input type="radio" name="q${index}" value="${i}">
                    ${opt}
                </label><br>
            `).join("")}
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
        const questionDiv = document.querySelectorAll(".question")[index];

        if (!selected) {
            questionDiv.innerHTML += `<p class="incorrect">No answer selected</p>`;
            return;
        }

        const selectedIndex = parseInt(selected.value);

        if (selectedIndex === q.correctIndex) {
            questionDiv.innerHTML += `
                <p class="correct">Correct!</p>
                <div class="explanation">${q.explanation}</div>
            `;
        } else {
            questionDiv.innerHTML += `
                <p class="incorrect">
                    Incorrect. Correct answer: ${q.options[q.correctIndex]}
                </p>
                <div class="explanation">${q.explanation}</div>
            `;
        }
    });
}
