import os
import sys
import threading
import webbrowser
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv

# ===========================================
# Detecção de caminho: compatível com local e exe empacotado
# ===========================================
def get_base_path():
    """Retorna o caminho base dos recursos (templates/static)."""
    if getattr(sys, 'frozen', False):
        # Modo exe empacotado: PyInstaller descompacta os recursos em sys._MEIPASS
        return sys._MEIPASS
    # Modo local: diretório do script
    return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

# Carrega .env: prioriza o diretório do exe/script, depois o diretório de trabalho atual
ENV_PATH = os.path.join(BASE_PATH, '.env')
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    load_dotenv()  # Tenta o .env do diretório de trabalho atual

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_PATH, 'templates'),
    static_folder=os.path.join(BASE_PATH, 'static')
)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])[-MAX_HISTORY:]
    custom_prompt = (data.get("system_prompt") or DEFAULT_PROMPT)[:MAX_PROMPT_LEN]
    model = data.get("model") or DEFAULT_MODEL

    try:
        completion = client.chat.completions.create(
            messages=[{"role": "system", "content": custom_prompt}, *messages],
            model=model,
            temperature=0.7,
            max_tokens=2048,
        )
        choice = completion.choices[0]
        reply = choice.message.content or ""
        print(f"[DEBUG] model={model} | finish_reason={choice.finish_reason} | reply_len={len(reply)}")

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
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Resuma em até 5 palavras o tema desta conversa. Responda apenas o título, sem pontuação final."},
                *messages
            ],
            model=model,
            temperature=0.3,
            max_tokens=64,
        )
        title = (completion.choices[0].message.content or "").strip()
        return jsonify({"title": title or "Conversa"})
    except Exception as e:
        print(f"[ERRO título] {e}")
        return jsonify({"title": "Conversa"})


# ===========================================
# Inicialização: local vs exe
# ===========================================
def open_browser():
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == "__main__":
    is_frozen = getattr(sys, 'frozen', False)
    if is_frozen:
        # Modo exe: abre o navegador após 2 segundos e desativa debug
        threading.Timer(2, open_browser).start()
        print("🦉 Corujinha Ajuda iniciado. O navegador abrirá automaticamente.")
        app.run(debug=False)
    else:
        # Modo local: comportamento idêntico ao anterior, com debug ativado
        app.run(debug=True)