let currentType;
let switchOn = false;
let question;
let quizData = [];

async function quiz() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput && fileInput.files.length > 0
    ? fileInput.files[0]
    : null;
    const outputDiv = document.querySelector(".output");

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

    if (!fileInput.files.length) {
        outputDiv.innerHTML = `Please select a file first.`;
        return;
    }

    outputDiv.innerHTML = `Summarizing notes...`;

    const file = fileInput && fileInput.files.length > 0
    ? fileInput.files[0]
    : null;
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

const inputModeToggle = document.getElementById("inputModeToggle");
const fileInput = document.getElementById("fileInput");
const linkInput = document.getElementById("linkInput");

inputModeToggle.addEventListener("change", () => {
  if (inputModeToggle.checked) {
    fileInput.classList.add("hidden");
    linkInput.classList.remove("hidden");
  } else {
    linkInput.classList.add("hidden");
    fileInput.classList.remove("hidden");
  }
});

// async function start() {
//   const isQuiz = document.getElementById("quizToggle").checked;
//   const useLink = document.getElementById("inputModeToggle").checked;
//   const out = document.getElementById("output");

//   out.innerHTML = isQuiz ? "Generating quiz..." : "Generating notes...";

//   const formData = new FormData();

//   if (useLink) {
//     const link = document.getElementById("linkInput").value.trim();
//     if (!link) {
//       alert("Please enter a link.");
//       return;
//     }
//     formData.append("link", link);
//   } else {
//     const fileInput = document.getElementById("fileInput");
//     if (!fileInput || fileInput.files.length === 0) {
//       alert("Please upload a file.");
//       return;
//     }
//     formData.append("file", fileInput.files[0]);
//   }

//   const url = isQuiz
//     ? "http://127.0.0.1:5000/quizgen"
//     : "http://127.0.0.1:5000/notegen";

//   try {
//     const res = await fetch(url, { method: "POST", body: formData });
//     const data = await res.json();

//     if (isQuiz) {
//       quizData = data;
//       renderQuiz();
//     } else {
//       out.innerHTML = data.output;
//       saveHistory(data.output);
//     }
//   } catch (err) {
//     console.error(err);
//     out.innerHTML = "Error generating content.";
//   }
// }

document.getElementById("startBtn").addEventListener("click", start());