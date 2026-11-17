import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Clientes
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
    """Retorna o cliente correto e o modelo baseado no ID."""
    if model_id.startswith("openrouter/") or model_id.endswith(":free"):
        return openrouter_client, model_id
    return groq_client, model_id

@app.route("/")
def home():
    return render_template("index.html")

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