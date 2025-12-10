async function generate() {
    const fileInput = document.getElementById("file");
    const outputDiv = document.querySelector(".output");

    if (!fileInput.files.length) {
        outputDiv.innerHTML = "Please select a file first.";
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("doctype", currentType);
    formData.append("file", file);

    try {
        const response = await fetch("http://localhost:5000/process", {
            method: "POST",
            body: formData
        });

        if (!response.ok) throw new Error("Server error: " + response.status);

        const data = await response.json();
        outputDiv.innerHTML = data.output;
        document.querySelector(".quiz-content").innerHTML = data.quiz;

    } catch (error) {
        outputDiv.textContent = "Error processing the file.";
        console.error("Fetch error:", error);
    }
}
