let currentType;
let genningNotes = false;

// Changes selected filetype
function docswitch() {
    const dropdown = document.getElementById("type-select");
    currentType = dropdown.value;

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

    if (genningNotes == false) {
        console.log("Generating notes...");
    } else {
        console.log("Button disabled. Happy new year!")
    }

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

        let genningNotes = false;
        console.log("Notes generated.")
    }
}