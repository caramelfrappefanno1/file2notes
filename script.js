let currentType;
let switchOn = false;
let question;

// Changes selected filetype
function docswitch() {
    const dropdown = document.getElementById("type-select");
    currentType = dropdown.value;

    console.log("Current document type:", currentType); // Debugging output
}

document.querySelector(".switch").addEventListener("change", function(event) {
    if (event.target.checked) {
        switchOn = true;
    } else {
        switchOn = false;
    }

    console.log("Value of switchOn: ", switchOn);
})

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

    if (currentType == "none") {
        outputDiv.innerHTML = `You didn't pick a filetype.`;
        return; 
    }

    else {
        if (!fileInput.files.length) {
            outputDiv.innerHTML = `Please select a file first.`;
            return;
        }

        outputDiv.innerHTML = `Making quiz item...`;

        const file = fileInput.files[0]; 
        const formData = new FormData();
        formData.append("doctype", currentType);
        formData.append("file", file);

        try {
            const response = await fetch("http://127.0.0.1:5000/quizgen", {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            outputDiv.innerHTML = data.output;
        } catch (error) {
            outputDiv.textContent = "Error processing the file.";
            console.error("Fetch error:", error);
        }

        console.log("Quiz function completed.");
    }
}

async function answer() {
    const answer = document.querySelector(".ansIn").value

    try {
        const response = await fetch("http://127.0.0.1:5000/answerquiz", {
            method: "POST",
            body: question
        });
        
        const data = await response.json();
        outputDiv.innerHTML = data.output;
    } catch (error) {
        outputDiv.textContent = "Error processing the file.";
        console.error("Fetch error:", error);
    }

    console.log("Answer function completed.");
}

async function revealHint() {
    console.log("Reveal Hint function completed.")
}

async function revealAnswer() {
    const answerTab = document.querySelector(".ansPnl")
    const question = document.querySelector(".output").textContent

    console.log("Hint function completed.")

    if (currentType == "none") {
        outputDiv.innerHTML = `You didn't pick a filetype.`;
        return; 
    }

    else {
        try {
            const response = await fetch("http://127.0.0.1:5000/answerquiz", {
                method: "POST",
                body: question
            });
            
            const data = await response.json();
            answerTab.innerHTML = data.output;
        } catch (error) {
            outputDiv.textContent = "Error processing the file.";
            console.error("Fetch error:", error);
        }
    }
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

async function submitAns() {
    const submitted = document.querySelector(".ansIn").value;
    const outputDiv = document.querySelector(".output");
    const answerTab = document.querySelector(".ansPnl");

    if (currentType == "none") {
        outputDiv.innerHTML = `You didn't pick a filetype.`;
        return;
    }

    else {
        try {
            const response = await fetch("http://127.0.0.1:5000/resolveanswer", {
                method: "POST",
                body: "Please check if this answer\n" + submitted + "\nIs a correct answer to the question\n" + outputDiv.innerHTML + "\n"
            });
            
            const data = await response.json();
            answerTab.innerHTML = data.output;
        } catch (error) {
            outputDiv.textContent = "Error processing the file.";
            console.error("Fetch error:", error);
        }
    }

    console.log("Submit function completed.")
}

async function start() {
    const switchSelector = document.querySelector(".switch");

    if (switchOn) {
        console.log("Quiz Mode on.");
        await quiz();
        return;
    } else {
        console.log("Note generate on.");
        await generate();
        return;
    }
}