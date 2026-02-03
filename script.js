const display = document.getElementById("display");
const historyList = document.getElementById("history");

function saveToHistory(content) {
  const li = document.createElement("li");
  li.textContent = content.replace(/<[^>]+>/g, "").slice(0, 40) + "...";
  li.onclick = () => display.innerHTML = content;
  historyList.prepend(li);
}

function renderQuiz(quiz) {
  let html = "";
  quiz.questions.forEach((q, i) => {
    html += `<div><strong>${i + 1}. ${q.question}</strong>`;
    q.choices.forEach((c, j) => {
      html += `<div>
        <label>
          <input type="radio" name="q${i}" value="${j}"> ${c}
        </label>
      </div>`;
    });
    html += `</div><hr>`;
  });
  return html;
}

async function start() {
  const text = document.getElementById("textInput").value.trim();
  const fileInput = document.getElementById("file");
  const isQuiz = document.querySelector(".toggle").checked;

  if (!text && !fileInput.files.length) {
    display.innerHTML = "Paste text or upload a file.";
    return;
  }

  const formData = new FormData();
  if (text) formData.append("text", text);
  if (fileInput.files.length) formData.append("file", fileInput.files[0]);

  display.innerHTML = "Generating...";

  const endpoint = isQuiz ? "/quizgen" : "/notegen";
  const res = await fetch(`http://127.0.0.1:5000${endpoint}`, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  const output = isQuiz ? renderQuiz(data) : data.output;

  display.innerHTML = output;
  saveToHistory(output);
}
