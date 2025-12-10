# imports #
import pdfplumber
import openai
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from docx import Document
import os
import speech_recognition as sr
from pydub import AudioSegment
from PIL import Image
import pytesseract
import base64

# flask setup #
app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = "uploads"  # Directory to store uploaded files
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

def get_key():
    f = open("api key.txt")
    key = f.read()
    f.close()
    return key

print(get_key())


# openai setup #
client = openai.OpenAI(api_key=f"{get_key()}")


# main functions #
def extract_text_from_pdf(pdf_path):
    """Extract text content from a PDF file using pdfplumber."""
    with pdfplumber.open(pdf_path) as pdf:
        text = " ".join(page.extract_text() or "" for page in pdf.pages)
    return text.strip()

def extract_text_from_docx(docx_path):
    """Extract text content from a DOCX file using python-docx."""
    doc = Document(docx_path)
    text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
    return text.strip()

def extract_from_image(img_path):
    """Extract text from an image using OpenAI's Vision API (OCR)."""
    with open(img_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")
        img_data_uri = f"data:image/jpeg;base64,{img_b64}"  # works for jpeg/png

    completion = client.chat.completions.create(
        model="gpt-4o-mini",  # vision-capable
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract all the words from this image, keep line breaks if possible."},
                    {"type": "image_url", "image_url": {"url": img_data_uri}}
                ]
            }
        ],
        max_tokens=1024,
    )

    return completion.choices[0].message.content.strip()


def extract_from_audio(audio_path):
    """Extract text from an audio file using speech recognition."""
    recognizer = sr.Recognizer()
    audio = AudioSegment.from_file(audio_path)
    audio = audio.set_channels(1).set_frame_rate(16000)  # Normalize audio
    temp_wav = "temp.wav"
    audio.export(temp_wav, format="wav")

    with sr.AudioFile(temp_wav) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError:
            text = "Speech Recognition API unavailable"

    os.remove(temp_wav)
    return text.strip()
    
def create_notes(file_path, file_type):
    if file_type == "PDF":
        text = extract_text_from_pdf(file_path)
    elif file_type == "DOCX":
        text = extract_text_from_docx(file_path)
    elif file_type in ["PNG", "JPEG"]:
        text = extract_from_image(file_path)
    elif file_type in ["MP3", "WAV"]:
        text = extract_from_audio(file_path)
    else:
        return file_type, "Unsupported file type"

    prompt = f"Generate notes based on the following text using the bullet point note-taking method. Notes should be short but comprehensive. Format in HTML in raw text. Remove the references portion.\n{text}"

    completion = client.chat.completions.create(
        max_tokens=4096,
        n=1,
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return completion.choices[0].message.content

# main flask stuff
@app.route("/process", methods=["POST"])
def process():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_type = request.form.get("doctype", "PDF").upper()  # Default to PDF
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)  # Save file to the server

    notes = create_notes(file_path, file_type)
    os.remove(file_path)  # Clean up uploaded file after processing

    return jsonify({"output": notes})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
'''
elif file_type == "MP3":
    text = extract_from_audio(file_path)
'''

'''
def extract_from_png(img_path):
    """Extract text from an image using OCR."""
    image = Image.open(img_path)
    return text.strip()

def extract_from_audio(audio_path):
    """Extract text from an audio file using speech recognition."""
    recognizer = sr.Recognizer()
    audio = AudioSegment.from_file(audio_path)
    audio = audio.set_channels(1).set_frame_rate(16000)
    temp_wav = "temp.wav"
    audio.export(temp_wav, format="wav")
    
    with sr.AudioFile(temp_wav) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
        except sr.UnknownValueError:
            text = ""
        except sr.RequestError:
            text = "Speech Recognition API unavailable"
    os.remove(temp_wav)
    return text.strip()
'''
