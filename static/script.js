let currentQuiz = null;
let currentMode = "file";
let loadedHistory = [];

function showError(msg){
    alert(msg);
}


function setMode(m) {
    currentMode = m; 
    document.getElementById("fileMode").style.display = m === "file" ? "block" : "none";
    document.getElementById("linkMode").style.display = m === "link" ? "block" : "none";

    // Add this to update the button highlight
    document.querySelectorAll(".mode-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.textContent.toLowerCase() === m) {
            btn.classList.add("active");
        }
    });
}


async function generateQuiz() {
    const btn = document.querySelector(".generate-btn");
    const progContainer = document.getElementById("progressContainer");
    const progBar = document.getElementById("uploadProgress");
    const progText = document.getElementById("progressText");
    const formData = new FormData();

    // 1. Validation Logic
    if (currentMode === "link") {
        const linkVal = document.getElementById("linkInput").value.trim();
        if (!linkVal) return alert("Please enter a link");
        formData.append("link", linkVal);
    } else {
        const fileInput = document.getElementById("fileInput");
        if (fileInput.files.length === 0) return alert("Please select a file");
        formData.append("file", fileInput.files[0]);
    }

    // 2. UI State
    btn.disabled = true;
    btn.textContent = "Processing...";
    progContainer.style.display = "block";

    // 3. Create XHR for progress tracking
    const xhr = new XMLHttpRequest();
    
    xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progBar.value = percent;
            progText.textContent = `Uploading... ${percent}%`;
            
            if (percent === 100) {
                progText.textContent = "AI is generating your quiz... (this may take a moment)";
            }
        }
    };

    xhr.onload = function() {
        btn.disabled = false;
        btn.textContent = "Generate Quiz";
        progContainer.style.display = "none";

        if (xhr.status === 200) {
            const quizData = JSON.parse(xhr.responseText);
            displayQuiz(quizData);
        } else {
            alert("Error: " + xhr.statusText);
        }
    };

    xhr.onerror = function() {
        alert("Network error occurred.");
        btn.disabled = false;
        btn.textContent = "Generate Quiz";
        progContainer.style.display = "none";
    };

    xhr.open("POST", "/quizgen", true);
    xhr.send(formData);
}


function displayQuiz(quiz) {
    let c = document.getElementById("quizContainer");
    c.innerHTML="";
    quiz.questions.forEach((q,i)=>{
        c.innerHTML+=`
        <div class="question">
        <p>${q.question}</p>
        ${q.choices.map((x,j)=>
        `<label><input type=radio name=q${i} value=${j}>${x}</label><br>`).join("")}
        <div id=f${i}></div>
        </div>`
    });
    c.innerHTML+=`<button id="downloadPDF" onclick="downloadPDF()" class="generate-btn">Download PDF</button>`
}


async function loadHistory() {
    const res = await fetch("/history");
    loadedHistory = await res.json(); // Store it globally
    
    const list = document.getElementById("historyList");
    list.innerHTML = "";

    // We reverse the array to show the newest quizzes first
    // Note: index 'i' refers to the original array position
    loadedHistory.slice().reverse().forEach((item, i) => {
        // Calculate the actual index in the original loadedHistory array
        const actualIndex = loadedHistory.length - 1 - i;
        const div = document.createElement("div");
        div.className = "history-item";
        
        const displayName = item.custom_name || `Quiz ${item.timestamp}`;

        div.innerHTML = `
            <div class="quiz-btn-main" onclick="openHistoryQuiz(${actualIndex})">
                <strong>${displayName}</strong>
            </div>
            <button class="dots-btn" onclick="toggleMenu(event, ${actualIndex})">⋮</button>
            <div id="menu-${actualIndex}" class="dropdown-menu">
                <div onclick="renameQuiz('${item.timestamp}', '${displayName}')">Rename</div>
                <div onclick="deleteQuiz('${item.timestamp}')" class="delete-opt">Delete</div>
            </div>
        `;
        list.appendChild(div);
    });
}

function toggleMenu(event, index) {
    event.stopPropagation();
    // Close other open menus
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
    document.getElementById(`menu-${index}`).classList.toggle('show');
}

window.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));
});

// Close menus when clicking anywhere else
window.onclick = () => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'));

async function deleteQuiz(ts) {
    if (!confirm("Delete this quiz?")) return;
    await fetch("/delete_quiz", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ timestamp: ts })
    });
    loadHistory();
}

async function renameQuiz(ts, currentName) {
    const newName = prompt("Enter new name:", currentName);
    if (!newName) return;
    await fetch("/rename_quiz", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ timestamp: ts, new_name: newName })
    });
    loadHistory();
}

function openHistoryQuiz(index) {
    const quizData = loadedHistory[index];
    displayQuiz(quizData);
}

function downloadPDF()
{

window.print();

}

async function generateNotes() {
    
}