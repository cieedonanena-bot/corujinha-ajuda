import os
import sys
import io
import pdfplumber
import docx
import openpyxl
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def get_base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

ENV_PATH = os.path.join(BASE_PATH, '.env')
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    load_dotenv()

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_PATH, 'templates'),
    static_folder=os.path.join(BASE_PATH, 'static')
)
CORS(app)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
openrouter_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

DEFAULT_PROMPT = """
Você é o "Corujinha Ajuda", um assistente de IA amigável, sábio e prestativo.
Sua personalidade é acolhedora e eficiente.
Responda sempre em português do Brasil de forma clara e objetiva.
Se não souber algo, admita educadamente.
Seu objetivo é ajudar o usuário com dúvidas, tarefas e criação de conteúdo.
"""

MAX_HISTORY = 10
MAX_PROMPT_LEN = 4000
DEFAULT_MODEL = "openai/gpt-oss-120b"

def get_client_and_model(model_id):
    if model_id.startswith("openrouter/") or model_id.endswith(":free"):
        return openrouter_client, model_id
    return groq_client, model_id

@app.route("/")
def home():
    return render_template("index.html")

@app.route('/service-worker.js')
def service_worker():
    return send_from_directory(app.static_folder, 'service-worker.js')

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nenhum arquivo selecionado."}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower()
    text = ""

    try:
        if ext == 'pdf':
            with pdfplumber.open(io.BytesIO(file.read())) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() or ""
                    text += "\n"
        elif ext == 'docx':
            doc = docx.Document(io.BytesIO(file.read()))
            for para in doc.paragraphs:
                text += para.text + "\n"
        elif ext == 'xlsx':
            wb = openpyxl.load_workbook(io.BytesIO(file.read()), data_only=True)
            for sheet in wb.worksheets:
                text += f"--- Planilha: {sheet.title} ---\n"
                for row in sheet.iter_rows(values_only=True):
                    row_text = "\t".join([str(cell) for cell in row if cell is not None])
                    if row_text.strip():
                        text += row_text + "\n"
        else:
            return jsonify({"error": "Formato não suportado. Use PDF, DOCX ou XLSX."}), 400

        if len(text) > 15000:
            text = text[:15000] + "\n\n[Atenção: O arquivo era muito grande e foi cortado.]"

        if not text.strip():
            return jsonify({"error": "Não foi possível extrair texto deste arquivo."}), 400

        return jsonify({"text": text})

    except Exception as e:
        print(f"[ERRO UPLOAD] {e}")
        return jsonify({"error": f"Erro ao processar o arquivo: {str(e)[:100]}"}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])[-MAX_HISTORY:]
    custom_prompt = (data.get("system_prompt") or DEFAULT_PROMPT)[:MAX_PROMPT_LEN]
    model = data.get("model") or DEFAULT_MODEL

    client, actual_model = get_client_and_model(model)

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "system", "content": custom_prompt}, *messages],
            model=actual_model,
            temperature=0.7,
            max_tokens=2048,
        )
        reply = completion.choices[0].message.content or ""
        print(f"[DEBUG] model={actual_model} | reply_len={len(reply)}")

        if not reply:
            return jsonify({"reply": "A IA não gerou texto desta vez. Tente reformular a pergunta."})
        return jsonify({"reply": reply})
    except Exception as e:
        msg = str(e)
        print(f"[ERRO] {msg}")
        if "429" in msg or "rate" in msg.lower():
            return jsonify({"error": "Muitas requisições. Aguarde alguns segundos."}), 429
        if "401" in msg or "invalid" in msg.lower():
            return jsonify({"error": "Chave da API inválida. Verifique o .env."}), 401
        if "404" in msg or "not found" in msg.lower():
            return jsonify({"error": f"Modelo '{model}' não encontrado. Escolha outro."}), 404
        return jsonify({"error": f"Erro: {msg[:200]}"}), 500

@app.route("/api/title", methods=["POST"])
def generate_title():
    data = request.get_json()
    messages = data.get("messages", [])[:2]
    model = data.get("model") or DEFAULT_MODEL
    client, actual_model = get_client_and_model(model)
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Resuma em até 5 palavras o tema desta conversa. Responda apenas o título, sem pontuação final."},
                *messages
            ],
            model=actual_model,
            temperature=0.3,
            max_tokens=64,
        )
        title = (completion.choices[0].message.content or "").strip()
        return jsonify({"title": title or "Conversa"})
    except Exception as e:
        print(f"[ERRO título] {e}")
        return jsonify({"title": "Conversa"})

if __name__ == "__main__":
    app.run(debug=True)