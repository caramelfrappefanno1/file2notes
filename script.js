let currentType;
let dropdown = document.getElementById("type-select");
let switchOn = false;
let question;
let quizData = [];

document.getElementById("file").addEventListener("change", function(event) {
    const file = event.target.files[0]; // Get the first selected file

    if (file) {
        console.log("Selected file:", file.name);
        
        // Read the file (if it's a text file, for example)
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log("File content:", e.target.result);
        };
        reader.readAsText(file); // Use `readAsDataURL(file)` for images
    }
});

async function quiz() {
    const fileInput = document.getElementById("file");
    const outputDiv = document.querySelector(".output");

    if (!fileInput.files.length) {
        outputDiv.innerHTML = "Please select a file.";
        return;
    }

    outputDiv.innerHTML = "Generating quiz...";

    const formData = new FormData();
    formData.append("doctype", currentType);
    formData.append("file", fileInput.files[0]);

    const response = await fetch("http://127.0.0.1:5000/quizgen", {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    quizData = data;

    renderQuiz();
}

function renderQuiz() {
    const outputDiv = document.querySelector(".output");
    outputDiv.innerHTML = "";

    quizData.questions.forEach((q, i) => {
        let html = `<div class="question">
            <p><strong>${i + 1}. ${q.question}</strong></p>`;

        q.choices.forEach((choice, j) => {
            html += `
                <label>
                    <input type="radio" name="q${i}" value="${j}">
                    ${choice}
                </label><br>`;
        });

        html += `</div><hr>`;
        outputDiv.innerHTML += html;
    });

    outputDiv.innerHTML += `<button onclick="submitQuiz()">Submit Quiz</button>`;
}

function submitQuiz() {
    let score = 0;

    quizData.questions.forEach((q, i) => {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (selected && Number(selected.value) === q.answer) {
            score++;
        }
    });

    alert(`You scored ${score} / ${quizData.questions.length}`);
}

async function generate() {
    const fileInput = document.getElementById("file");
    const outputDiv = document.querySelector(".output");

    if (currentType == "none") {
        outputDiv.innerHTML = `You didn't pick a filetype.`;
        return; 
    }

    else {
        if (!fileInput.files.length) {
            outputDiv.innerHTML = `Please select a file first.`;
            return;
        }

        outputDiv.innerHTML = `Summarizing notes...`;

        const file = fileInput.files[0]; 
        const formData = new FormData();
        formData.append("doctype", currentType);
        formData.append("file", file);

        try {
            const response = await fetch("http://127.0.0.1:5000/notegen", {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            outputDiv.innerHTML = data.output;
        } catch (error) {
            outputDiv.textContent = "Error processing the file.";
            console.error("Fetch error:", error);
        }

        console.log("Notes generated.")
    }
}



async function start() {
    currentType = dropdown.value;
    const switchSelector = document.querySelector(".toggle");

    if (switchSelector.checked) {
        console.log("Quiz Mode on.");
        await quiz();
        return;
    } else {
        console.log("Note generate on.");
        await generate();
        return;
    }
}