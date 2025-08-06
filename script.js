let currentType = "PDF";

function docswitch() {
    const button = document.querySelector(".doc-btn");

    // Toggle between PDF and DOC
    if (currentType === "PDF") {
        currentType = "DOCX";
        button.textContent = "DOCX";
    } else if (currentType === "DOCX") {
        currentType = "PNG";
        button.textContent = "PNG";
    } else if (currentType === "PNG") {
        currentType = "JPEG";
        button.textContent = "JPEG";
    } else if (currentType === "JPEG") {
        currentType = "MP3";
        button.textContent = "MP3";
    } else {
        currentType = "PDF";
        button.textContent = "PDF";
    }

    console.log("Current document type:", currentType); // Debugging output
}

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

async function generate() {
    const fileInput = document.getElementById("file");
    const outputDiv = document.querySelector(".output");

    if (!fileInput.files.length) {
        outputDiv.innerHTML = `Please select a file first.`;
        return;
    }

    const file = fileInput.files[0]; 
    const formData = new FormData();
    formData.append("doctype", currentType);
    formData.append("file", file);

    try {
        const response = await fetch("http://127.0.0.1:5000/process", {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        outputDiv.innerHTML = data.output;
    } catch (error) {
        outputDiv.textContent = "Error processing the file.";
        console.error("Fetch error:", error);
    }
}