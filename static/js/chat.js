// ===========================================
// Corujinha Ajuda - Lógica completa (Com Voz e Anexo)
// ===========================================

const chatDiv = document.getElementById('chat');
const input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatTitle = document.getElementById('chatTitle');
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeName = document.getElementById('welcomeName');
const modelSelect = document.getElementById('modelSelect');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const micBtn = document.getElementById('micBtn');

const attachmentPreview = document.getElementById('attachmentPreview');
const attName = document.getElementById('attName');
const attIcon = document.getElementById('attIcon');
const removeAttBtn = document.getElementById('removeAttBtn');

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuToggle = document.getElementById('menuToggle');
const newChatBtn = document.getElementById('newChatBtn');
const historyBtn = document.getElementById('historyBtn');
const programmingBtn = document.getElementById('programmingBtn');
const historyList = document.getElementById('historyList');
const profileBtn = document.getElementById('profileBtn');
const profileName = document.getElementById('profileName');
const settingsBtn = document.getElementById('settingsBtn');

const profileModal = document.getElementById('profileModal');
const settingsModal = document.getElementById('settingsModal');
const userNameInput = document.getElementById('userNameInput');
const promptInput = document.getElementById('promptInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const savePromptBtn = document.getElementById('savePromptBtn');

marked.setOptions({ breaks: true, gfm: true });

let conversations = JSON.parse(localStorage.getItem('corujinha_conversations') || '[]');
let currentConversationId = null;
let isSending = false;
let theme = localStorage.getItem('corujinha_theme') || 'light';
let pendingAttachment = null;

const DEFAULT_PROMPT = `Você é o "Corujinha Ajuda", um assistente de IA amigável, sábio e prestativo.
Sua personalidade é acolhedora e eficiente.
Responda sempre em português do Brasil de forma clara e objetiva.
Se não souber algo, admita educadamente.
Seu objetivo é ajudar o usuário com dúvidas, tarefas e criação de conteúdo.`;

let systemPrompt = localStorage.getItem('corujinha_prompt') || DEFAULT_PROMPT;
let userName = localStorage.getItem('corujinha_username') || '';
let selectedModel = localStorage.getItem('corujinha_model') || 'openai/gpt-oss-120b';

modelSelect.value = selectedModel;
modelSelect.addEventListener('change', () => {
    selectedModel = modelSelect.value;
    localStorage.setItem('corujinha_model', selectedModel);
});

function applyTheme() { document.documentElement.setAttribute('data-theme', theme); }
applyTheme();

function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('corujinha_theme', theme);
    applyTheme();
}

function saveConversations() { localStorage.setItem('corujinha_conversations', JSON.stringify(conversations)); }

function saveCurrentConversation() {
    if (!currentConversationId) return;
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    conv.messages = Array.from(chatDiv.querySelectorAll('.message-row'))
        .filter(row => !row.classList.contains('typing-row'))
        .map(row => {
            const isUser = row.classList.contains('user');
            const msgEl = row.querySelector('.message');
            return { role: isUser ? 'user' : 'assistant', content: msgEl.dataset.raw || msgEl.textContent };
        });
    saveConversations();
}

function renderMarkdown(raw) { return DOMPurify.sanitize(marked.parse(raw)); }

function renderHistory() {
    historyList.innerHTML = '';
    conversations.forEach(conv => {
        const el = document.createElement('div');
        el.className = 'history-item' + (conv.id === currentConversationId ? ' active' : '');

        const title = document.createElement('span');
        title.className = 'history-title';
        title.textContent = conv.title || 'Conversa';
        title.addEventListener('click', () => loadConversation(conv.id));

        const del = document.createElement('button');
        del.className = 'del-btn';
        del.textContent = '🗑️';
        del.title = 'Excluir';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            conversations = conversations.filter(c => c.id !== conv.id);
            saveConversations();
            if (currentConversationId === conv.id) createNewConversation();
            else renderHistory();
        });

        el.appendChild(title);
        el.appendChild(del);
        historyList.appendChild(el);
    });
}

function showWelcome() {
    welcomeScreen.classList.remove('hidden');
    chatDiv.innerHTML = '';
    welcomeName.textContent = userName || 'amigo(a)';
    modelSelect.value = selectedModel;
}

function hideWelcome() { welcomeScreen.classList.add('hidden'); }

function createNewConversation() {
    const conv = { id: Date.now().toString(), title: 'Nova conversa', messages: [] };
    conversations.unshift(conv);
    saveConversations();
    currentConversationId = conv.id;
    chatTitle.textContent = conv.title;
    showWelcome();
    renderHistory();
    input.focus();
}

function loadConversation(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    currentConversationId = id;
    chatTitle.textContent = conv.title;

    if (conv.messages.length === 0) {
        showWelcome();
    } else {
        hideWelcome();
        chatDiv.innerHTML = '';
        conv.messages.forEach(msg => {
            addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot', false, msg.role === 'assistant');
        });
    }
    renderHistory();
    closeSidebar();
}

async function sendMessage() {
    let text = input.value.trim();
    const attachmentText = pendingAttachment ? pendingAttachment.text : null;
    const attachmentName = pendingAttachment ? pendingAttachment.name : null;

    if (!text && !attachmentText) return;
    if (isSending) return;

    if (!currentConversationId) createNewConversation();

    isSending = true;
    sendBtn.disabled = true;
    hideWelcome();

    let messageContent = text;
    if (attachmentText) {
        messageContent = `[Arquivo: ${attachmentName}]\n\n${attachmentText}\n\n---\n\nPergunta do usuário: ${text || "Resuma o conteúdo."}`;
        
        const ext = attachmentName.split('.').pop().toLowerCase();
        const icons = { pdf: '📄', docx: '📝', xlsx: '📊' };
        const icon = icons[ext] || '📎';
        
        const row = document.createElement('div');
        row.className = 'message-row user';
        row.innerHTML = `
            <div class="avatar user">${(userName ? userName.charAt(0).toUpperCase() : 'U')}</div>
            <div class="message-content">
                <div class="message user file-card">
                    <div style="display: flex; align-items: center; gap: 10px; padding: 4px 8px;">
                        <span style="font-size: 24px;">${icon}</span>
                        <div style="display: flex; flex-direction: column;">
                            <strong style="font-size: 14px;">${attachmentName}</strong>
                            <small style="opacity: 0.8; font-size: 11px;">Arquivo anexado</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        chatDiv.appendChild(row);
        
        pendingAttachment = null;
        attachmentPreview.style.display = 'none';
    }

    if (text || (!text && !attachmentText)) {
        addMessage(text || 'Analise o arquivo em anexo.', 'user', true, false);
    }

    input.value = '';
    input.style.height = 'auto';

    const conv = conversations.find(c => c.id === currentConversationId);
    const isFirstMessage = conv && conv.title === 'Nova conversa';
    if (isFirstMessage) {
        conv.title = (attachmentName ? `Análise: ${attachmentName}` : text).slice(0, 40);
        chatTitle.textContent = conv.title;
        renderHistory();
    }

    const typingEl = addTypingIndicator();

    try {
        const history = Array.from(chatDiv.querySelectorAll('.message-row'))
            .filter(row => !row.classList.contains('typing-row'))
            .slice(-10)
            .map((row, index, arr) => {
                const isUser = row.classList.contains('user');
                const msgEl = row.querySelector('.message');
                let content = msgEl.dataset.raw || msgEl.textContent;
                
                if (isUser && attachmentText && index === arr.length - 1) {
                    content = messageContent;
                }
                return { role: isUser ? 'user' : 'assistant', content: content };
            });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: history,
                system_prompt: systemPrompt,
                model: selectedModel
            })
        });

        const data = await response.json();
        typingEl.remove();

        if (data.reply) {
            addMessage(data.reply, 'bot', true, true);
            if (isFirstMessage) generateTitle(conv);
        } else {
            addMessage(data.error || 'Desculpe, tive um problema.', 'bot', true, false);
        }
    } catch (error) {
        typingEl.remove();
        console.error(error);
        addMessage('Erro de conexão com o servidor.', 'bot', true, false);
    } finally {
        isSending = false;
        sendBtn.disabled = false;
        input.focus();
        saveCurrentConversation();
    }
}

async function generateTitle(conv) {
    try {
        const r = await fetch('/api/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: conv.messages.slice(0, 2),
                model: selectedModel
            })
        });
        const d = await r.json();
        if (d.title) {
            conv.title = d.title;
            saveConversations();
            chatTitle.textContent = d.title;
            renderHistory();
        }
    } catch (e) { /* silencioso */ }
}

function addMessage(text, sender, animate = true, isMarkdown = false) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    if (!animate) row.style.animation = 'none';

    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender}`;
    avatar.textContent = sender === 'bot' ? '🦉' : (userName ? userName.charAt(0).toUpperCase() : 'U');

    const contentWrap = document.createElement('div');
    contentWrap.className = 'message-content';

    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.dataset.raw = text;

    if (isMarkdown && sender === 'bot') {
        msg.innerHTML = renderMarkdown(text);
        enhanceCodeBlocks(msg);
    } else {
        msg.textContent = text;
    }

    contentWrap.appendChild(msg);
    addMessageActions(contentWrap, text, sender);

    row.appendChild(avatar);
    row.appendChild(contentWrap);
    chatDiv.appendChild(row);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    return row;
}

function addMessageActions(contentWrap, text, sender) {
    if (!contentWrap) return;
    if (contentWrap.querySelector('.message-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'message-actions';

    if (sender === 'user') {
        const editBtn = document.createElement('button');
        editBtn.className = 'msg-action-btn';
        editBtn.textContent = '✏️ Editar';
        editBtn.addEventListener('click', () => {
            const row = contentWrap.closest('.message-row');
            if (row) startEditMessage(row, text);
        });
        actions.appendChild(editBtn);
    } else {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'msg-action-btn';
        copyBtn.textContent = '📋 Copiar';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                copyBtn.textContent = '✅ Copiado!';
                setTimeout(() => { copyBtn.textContent = '📋 Copiar'; }, 1500);
            });
        });
        actions.appendChild(copyBtn);
    }

    contentWrap.appendChild(actions);
}

function enhanceCodeBlocks(container) {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.previousElementSibling && pre.previousElementSibling.classList.contains('code-header')) return;
        const code = pre.querySelector('code');
        if (!code) return;

        const header = document.createElement('div');
        header.className = 'code-header';

        const langLabel = document.createElement('span');
        langLabel.textContent = code.className.replace('language-', '') || 'código';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-code-btn';
        copyBtn.textContent = 'Copiar';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(code.textContent).then(() => {
                copyBtn.textContent = '✅ Copiado!';
                setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 1500);
            });
        });

        header.appendChild(langLabel);
        header.appendChild(copyBtn);
        pre.parentNode.insertBefore(header, pre);
    });
}

function addTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row bot typing-row';
    row.innerHTML = `<div class="avatar bot">🦉</div><div class="message bot typing">Corujinha está digitando...</div>`;
    chatDiv.appendChild(row);
    chatDiv.scrollTop = chatDiv.scrollHeight;
    return row;
}

function startEditMessage(row, originalText) {
    if (isSending) return;
    const contentWrap = row.querySelector('.message-content');
    const msgEl = row.querySelector('.message');
    const actions = row.querySelector('.message-actions');
    if (!contentWrap || !msgEl) return;

    msgEl.style.display = 'none';
    if (actions) actions.style.display = 'none';

    const editArea = document.createElement('div');
    editArea.className = 'edit-area';

    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = originalText;

    const btnRow = document.createElement('div');
    btnRow.className = 'edit-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'edit-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
        editArea.remove();
        msgEl.style.display = '';
        if (actions) actions.style.display = '';
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'edit-save';
    saveBtn.textContent = 'Salvar e reenviar';
    saveBtn.addEventListener('click', () => {
        const newText = textarea.value.trim();
        if (!newText) return;
        let current = row;
        while (current) {
            const next = current.nextElementSibling;
            current.remove();
            current = next;
        }
        msgEl.dataset.raw = newText;
        saveCurrentConversation();
        input.value = newText;
        input.dispatchEvent(new Event('input'));
        sendMessage();
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(saveBtn);
    editArea.appendChild(textarea);
    editArea.appendChild(btnRow);
    contentWrap.appendChild(editArea);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }
function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) { modal.classList.remove('active'); }

// ===========================================
// Upload de Arquivos (Chip)
// ===========================================
attachBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    attachmentPreview.style.display = 'inline-flex';
    attIcon.textContent = '⏳';
    attName.textContent = `Lendo ${file.name}...`;
    removeAttBtn.style.display = 'none';

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        fileInput.value = ''; 

        if (data.error) {
            alert(`Erro no arquivo: ${data.error}`);
            attachmentPreview.style.display = 'none';
            return;
        }

        pendingAttachment = { name: file.name, text: data.text };
        
        const ext = file.name.split('.').pop().toLowerCase();
        const icons = { pdf: '📄', docx: '📝', xlsx: '📊' };
        
        attIcon.textContent = icons[ext] || '📎';
        attName.textContent = file.name;
        removeAttBtn.style.display = 'flex';
        
        input.focus();
        
    } catch (error) {
        console.error(error);
        attachmentPreview.style.display = 'none';
        alert('Erro de conexão ao enviar o arquivo.');
    }
});

removeAttBtn.addEventListener('click', () => {
    pendingAttachment = null;
    attachmentPreview.style.display = 'none';
    fileInput.value = '';
});

// ===========================================
// Entrada por Voz (Web Speech API)
// ===========================================
let recognition = null;
let isRecording = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    micBtn.style.display = 'flex';
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (input.value.trim() !== '') {
            input.value += ' ' + transcript;
        } else {
            input.value = transcript;
        }
        input.dispatchEvent(new Event('input'));
        input.focus();
    };

    recognition.onerror = (event) => {
        console.error('Erro de voz:', event.error);
        if (event.error === 'not-allowed') {
            alert('Permissão de microfone negada. Habilite o microfone nas configurações do navegador.');
        }
        stopRecording();
    };

    recognition.onend = () => {
        stopRecording();
    };
}

function startRecording() {
    if (!recognition) return;
    try {
        recognition.start();
        isRecording = true;
        micBtn.classList.add('recording');
        micBtn.title = 'Gravando... Clique para parar';
    } catch (e) {
        console.error(e);
    }
}

function stopRecording() {
    isRecording = false;
    micBtn.classList.remove('recording');
    micBtn.title = 'Entrada por voz';
    if (recognition) {
        try { recognition.stop(); } catch (e) {}
    }
}

micBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// ===========================================
// Eventos Globais e Inicialização
// ===========================================
sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

newChatBtn.addEventListener('click', () => { saveCurrentConversation(); createNewConversation(); closeSidebar(); });
historyBtn.addEventListener('click', () => { renderHistory(); closeSidebar(); });

programmingBtn.addEventListener('click', () => {
    saveCurrentConversation();
    createNewConversation();
    systemPrompt = (localStorage.getItem('corujinha_prompt') || DEFAULT_PROMPT) +
        '\n\nModo Programação: priorize exemplos de código, boas práticas e explicações técnicas detalhadas.';
    closeSidebar();
    input.focus();
});

profileBtn.addEventListener('click', () => { userNameInput.value = userName; openModal(profileModal); closeSidebar(); });
settingsBtn.addEventListener('click', () => { promptInput.value = systemPrompt; openModal(settingsModal); closeSidebar(); });

saveProfileBtn.addEventListener('click', () => {
    userName = userNameInput.value.trim();
    localStorage.setItem('corujinha_username', userName);
    profileName.textContent = userName || 'Meu perfil';
    welcomeName.textContent = userName || 'amigo(a)';
    closeModal(profileModal);
});

savePromptBtn.addEventListener('click', () => {
    systemPrompt = promptInput.value.trim() || DEFAULT_PROMPT;
    localStorage.setItem('corujinha_prompt', systemPrompt);
    closeModal(settingsModal);
});

menuToggle.addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);
document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => { closeModal(profileModal); closeModal(settingsModal); }));
document.querySelectorAll('.suggestion-card').forEach(card => card.addEventListener('click', () => {
    input.value = card.dataset.prompt;
    input.dispatchEvent(new Event('input'));
    sendMessage();
}));

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') { e.preventDefault(); newChatBtn.click(); }
    if (e.ctrlKey && e.key === '/') { e.preventDefault(); settingsBtn.click(); }
    if (e.ctrlKey && e.shiftKey && e.key === 'O') { e.preventDefault(); toggleTheme(); }
    if (e.key === 'Escape') { closeModal(profileModal); closeModal(settingsModal); closeSidebar(); }
});

window.addEventListener('load', () => {
    profileName.textContent = userName || 'Meu perfil';
    if (conversations.length > 0) loadConversation(conversations[0].id);
    else createNewConversation();
    input.focus();
});