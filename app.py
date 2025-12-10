import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import pdfplumber
from docx import Document
from PIL import Image, ImageFilter, ImageOps
import pytesseract
from pydub import AudioSegment
import speech_recognition as sr
from gpt4all import GPT4All

# ---------- CONFIG ----------
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
pytesseract.pytesseract.tesseract_cmd = r"E:\tesseract\tesseract.exe"

# ---------- APP ----------
app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
CORS(app, resources={r"/*": {"origins": "*"}})

# ---------- MODEL ----------
model = GPT4All("mistral-7b-openorca.Q4_0.gguf")

# ---------- UTILITIES ----------
def clean_ocr_image(img):
    img = img.convert("L")
    img = ImageOps.autocontrast(img)
    img = img.filter(ImageFilter.SHARPEN)
    return img

def extract_text_from_pdf(pdf_path):
    text_chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_chunks.append(page.extract_text() or "")
            try:
                img = page.to_image(resolution=200).original
                img = clean_ocr_image(img)
                text_chunks.append(pytesseract.image_to_string(img))
            except:
                pass
    return "\n".join(text_chunks).strip()

def extract_text_from_docx(docx_path):
    doc = Document(docx_path)
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())

def extract_from_image(img_path):
    img = Image.open(img_path)
    img = clean_ocr_image(img)
    return pytesseract.image_to_string(img).strip()

def extract_from_audio(audio_path):
    recognizer = sr.Recognizer()
    audio = AudioSegment.from_file(audio_path)
    audio = audio.set_channels(1).set_frame_rate(16000)
    temp_wav = "temp.wav"
    audio.export(temp_wav, format="wav")
    with sr.AudioFile(temp_wav) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except:
            text = ""
    os.remove(temp_wav)
    return text.strip()

def create_notes_and_quiz(file_path, file_type):
    if file_type == "PDF":
        text = extract_text_from_pdf(file_path)
    elif file_type == "DOCX":
        text = extract_text_from_docx(file_path)
    elif file_type in ["PNG", "JPEG", "JPG"]:
        text = extract_from_image(file_path)
    elif file_type in ["MP3", "WAV"]:
        text = extract_from_audio(file_path)
    else:
        return ("Unsupported file type", "")

    notes_prompt = f"Summarize this text into bullet notes (HTML format):\n{text}"
    quiz_prompt = f"Create 10 multiple-choice questions (HTML list, 4 options each, no answers):\n{text}"

    with model.chat_session():
        notes = model.generate(notes_prompt, max_tokens=1024)
        quiz = model.generate(quiz_prompt, max_tokens=1024)

    return notes, quiz

# ---------- ROUTE ----------
@app.route("/process", methods=["POST"])
def process():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_type = request.form.get("doctype", "PDF").upper()
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    notes, quiz = create_notes_and_quiz(file_path, file_type)

    os.remove(file_path)
    return jsonify({"output": notes, "quiz": quiz})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
