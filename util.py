import pdfplumber
from docx import Document


def extract_text_from_pdf(path):

    try:

        with pdfplumber.open(path) as pdf:

            return "\n".join(page.extract_text() or "" for page in pdf.pages)

    except Exception as e:

        print("PDF ERROR:", e)

        return ""


def extract_text_from_docx(path):
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)

    except Exception as e:
        print("DOCX ERROR:", e)
        return ""