let currentMode = "file";
let currentQuiz = null

function setMode(mode, btn) {
    currentMode = mode;
    document.getElementById("fileMode").style.display = mode === "file" ? "block" : "none";
    document.getElementById("linkMode").style.display = mode === "link" ? "block" : "none";
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

function showErrorPopup(message) {
    alert("Error: " + message);
}

async function generateQuiz() {

    const container = document.getElementById("quizContainer");

    const progressBox = document.getElementById("progressContainer");
    const progressBar = document.getElementById("uploadProgress");
    const progressText = document.getElementById("progressText");

    container.innerHTML = "";
    progressBox.style.display = "block";

    try {

        if (currentMode === "file") {

            const fileInput = document.getElementById("fileInput");

            if (!fileInput.files.length) {
                alert("Please select a file.");
                progressBox.style.display = "none";
                return;
            }

            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = function(event) {

                if (event.lengthComputable) {

                    const percent = Math.round((event.loaded / event.total) * 100);

                    progressBar.value = percent;

                    progressText.innerText = `Uploading... ${percent}%`;

                    if (percent === 100) {
                        progressText.innerText = "AI is generating your quiz...";
                    }
                }
            };

            xhr.onload = function() {

                progressBox.style.display = "none";

                if (xhr.status === 200) {

                    const data = JSON.parse(xhr.responseText);
                    displayQuiz(data);

                } else {

                    const data = JSON.parse(xhr.responseText);
                    showErrorPopup(data.error || "Server error.");
                }
            };

            xhr.onerror = function() {

                progressBox.style.display = "none";
                showErrorPopup("Network error occurred.");
            };

            xhr.open("POST", "/quizgen", true);
            xhr.send(formData);

        }

        else if (currentMode === "link") {

            let link = document.getElementById("linkInput").value.trim();

            if (!link) {
                alert("Please enter a URL.");
                progressBox.style.display = "none";
                return;
            }

            if (!link.startsWith("http")) {
                link = "https://" + link;
            }

            const response = await fetch("/quizgen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link })
            });

            progressBox.style.display = "none";

            const data = await response.json();

            if (!response.ok) {
                showErrorPopup(data.error || "Error generating quiz.");
                container.innerHTML = "";
                return;
            }

            displayQuiz(data);
        }

    } catch (err) {

        progressBox.style.display = "none";
        console.error(err);
        showErrorPopup("Network error. Please check your internet connection.");
        container.innerHTML = "";
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
    currentQuiz = data
    
    const container = document.getElementById("quizContainer");
    container.innerHTML = "";

    if (!data.questions || !Array.isArray(data.questions)) {
        showErrorPopup("Error generating quiz. Please try again.");
        container.innerHTML = "";
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

    const pdfBtn = document.createElement("button");
    pdfBtn.className = "generate-btn";
    pdfBtn.textContent = "Download Quiz as PDF";
    pdfBtn.onclick = downloadPDF;

container.appendChild(pdfBtn);
}

async function downloadPDF() {

    if (!currentQuiz) {
        alert("No quiz to download.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(18);
    doc.text("AI Generated Quiz", 20, y);
    y += 15;

    currentQuiz.questions.forEach((q, index) => {

        if (y > 260) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(12);
        doc.text(`Q${index + 1}: ${q.question}`, 20, y);
        y += 8;

        q.choices.forEach((choice, i) => {
            doc.text(`${String.fromCharCode(65+i)}. ${choice}`, 25, y);
            y += 7;
        });

        y += 5;
    });

    doc.addPage();

    y = 20;

    doc.setFontSize(16);
    doc.text("Answer Key", 20, y);
    y += 15;

    currentQuiz.questions.forEach((q, index) => {

        if (y > 260) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(12);
        doc.text(`Q${index + 1}: ${q.choices[q.answer]}`, 20, y);
        y += 8;

        doc.setFontSize(10);
        doc.text(`Explanation: ${q.explanation}`, 20, y);
        y += 10;

    });

    doc.save("AI_Quiz.pdf");
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

async function generateNotes() {

    const container = document.getElementById("quizContainer");
    container.innerHTML = "<p>Generating notes...</p>";

    try {

        if (currentMode === "file") {

            const fileInput = document.getElementById("fileInput");

            if (!fileInput.files.length) {
                alert("Please select a file.");
                return;
            }

            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            const response = await fetch("/notes", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                showErrorPopup(data.error || "Error generating notes.");
                return;
            }

            container.innerHTML = `
                <div class="question">
                    <h3>Study Notes</h3>
                    <pre>${data.notes}</pre>
                </div>
            `;
        }

        else if (currentMode === "link") {

            let link = document.getElementById("linkInput").value.trim();

            if (!link) {
                alert("Please enter a URL.");
                return;
            }

            if (!link.startsWith("http")) {
                link = "https://" + link;
            }

            const response = await fetch("/notes", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({link})
            });

            const data = await response.json();

            if (!response.ok) {
                showErrorPopup(data.error || "Error generating notes.");
                container.innerHTML = "";
                return;
            }

            container.innerHTML = `
                <div class="question">
                    <h3>Study Notes</h3>
                    <pre>${data.notes}</pre>
                </div>
            `;
        }

    } catch(err) {
        console.error(err);
        showErrorPopup("Network error occurred.");
    }
}