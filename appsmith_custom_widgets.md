# Appsmith Custom Widgets for AuditIQ (Deloitte Theme)

This document contains the exact code to copy-paste into your Appsmith Custom Widgets. We've used Tailwind CSS via CDN and configured it with the custom **Deloitte color palette**. The Flowise Chatbot is now a circular Floating Action Button (FAB) that opens seamlessly when clicked.

---

## 1. Data Explorer Widget

### HTML
```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          deloitte: {
            green: '#86BC25',
            black: '#0F0B0B',
            white: '#FFFFFF',
            coolGray: '#75787B',
            lightGray: '#D0D0CE',
            blue: '#00A3E0',
            darkTeal: '#004F59',
            canvas: '#FBFBFB'
          }
        }
      }
    }
  }
</script>

<div class="space-y-6 animate-in fade-in duration-500 h-full flex flex-col bg-deloitte-canvas p-6 text-deloitte-black font-sans" style="height: 100vh;">
  <div class="flex justify-between items-center mb-2">
    <h2 class="text-2xl font-bold">Data Explorer</h2>
    <div class="flex gap-2">
      <select class="px-4 py-2 bg-white border border-deloitte-lightGray rounded-lg text-sm text-deloitte-black focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green shadow-sm font-semibold">
         <option>Raw Invoices Table</option>
         <option>PO / GRN Records</option>
         <option>Raw Audit Results</option>
         <option>Vendor Master List</option>
         <option>Agent Execution Logs</option>
      </select>
      <button class="px-4 py-2 bg-deloitte-green text-white rounded-lg text-sm font-semibold hover:bg-[#75A320] transition-colors shadow-sm flex items-center gap-2">
         <i data-lucide="download" class="w-4 h-4"></i> Export View
      </button>
    </div>
  </div>
  
  <div class="bg-white rounded-xl shadow-sm border border-deloitte-lightGray flex-1 flex flex-col overflow-hidden p-0">
    <div class="p-4 border-b border-deloitte-lightGray bg-deloitte-canvas flex gap-4">
      <div class="flex-1 relative">
         <input type="text" placeholder="Search entire dataset (e.g. INV-9921, TechCorp)..." class="w-full pl-10 pr-4 py-2 bg-white border border-deloitte-lightGray rounded-lg text-sm focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green" />
         <i data-lucide="file-search" class="absolute left-3 top-2.5 text-deloitte-coolGray w-4 h-4"></i>
      </div>
      <button class="px-4 py-2 bg-white border border-deloitte-lightGray rounded-lg text-sm font-semibold text-deloitte-black hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
        <i data-lucide="settings" class="w-4 h-4"></i> Advanced Filters
      </button>
    </div>
    <div class="flex-1 overflow-auto bg-white">
      <table class="w-full text-sm text-left">
        <thead class="text-xs text-deloitte-coolGray uppercase bg-[#F3F4F6] sticky top-0 border-b border-deloitte-lightGray shadow-sm z-10">
          <tr>
            <th class="py-3 px-6 font-semibold">ID</th>
            <th class="py-3 px-6 font-semibold">Date</th>
            <th class="py-3 px-6 font-semibold">Vendor</th>
            <th class="py-3 px-6 font-semibold">Amount</th>
            <th class="py-3 px-6 font-semibold">AI Risk Score</th>
            <th class="py-3 px-6 font-semibold">Raw JSON Output</th>
            <th class="py-3 px-6 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody id="data-table-body">
          <!-- Rows injected via JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Chatbot UI -->
  <div id="chatbot-wrapper" class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
    <!-- Chat Window -->
    <div id="chat-window" class="w-80 bg-white border border-deloitte-lightGray shadow-2xl rounded-2xl flex-col overflow-hidden hidden transition-all duration-300 transform translate-y-4 opacity-0">
      <div class="bg-deloitte-black text-white p-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <i data-lucide="bot" class="w-5 h-5 text-deloitte-green"></i>
          <h3 class="font-bold">AuditIQ Assistant</h3>
        </div>
        <button onclick="toggleChat()" class="text-deloitte-lightGray hover:text-white transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
      <div id="chat-body" class="flex flex-col h-[400px]">
        <div id="chat-history" class="flex-1 overflow-auto p-4 space-y-4 text-sm bg-deloitte-canvas"></div>
        <div id="chat-suggestions" class="px-4 pb-2 flex flex-wrap gap-2 bg-deloitte-canvas"></div>
        <div class="p-3 border-t border-deloitte-lightGray bg-white">
          <input type="text" id="chat-input" placeholder="Ask AI..." class="w-full px-3 py-2 border border-deloitte-lightGray rounded-lg text-sm focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green" />
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <button id="chat-fab" onclick="toggleChat()" class="w-14 h-14 bg-deloitte-green hover:bg-[#75A320] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105">
      <i data-lucide="message-square" class="w-6 h-6"></i>
    </button>
  </div>
</div>
```

### CSS
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D0D0CE; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #75787B; }
```

### JavaScript
```javascript
// Initialize Icons
lucide.createIcons();

// --- 1. Mock Data for Explorer Table ---
const mockData = Array.from({length: 15}).map((_, i) => ({
  id: `INV-990${i}`,
  date: `2026-05-0${Math.max(1, i%5 + 1)}`,
  vendor: `Vendor ${String.fromCharCode(65+i)}`,
  amount: `$${(Math.random() * 50000).toFixed(2)}`,
  score: Math.floor(Math.random() * 100),
  json: "{ flags: [...] }"
}));

function renderTable() {
  const tbody = document.getElementById('data-table-body');
  tbody.innerHTML = mockData.map(d => {
    let scoreClass = d.score > 80 ? 'bg-[#FFEBEE] text-[#C62828]' : d.score > 50 ? 'bg-[#FFF8E1] text-[#F9A825]' : 'bg-[#E8F5E9] text-[#2E7D32]';
    return `
      <tr class="border-b border-deloitte-lightGray hover:bg-gray-50 transition-colors">
        <td class="py-3 px-6 font-mono text-deloitte-coolGray">${d.id}</td>
        <td class="py-3 px-6 text-deloitte-coolGray">${d.date}</td>
        <td class="py-3 px-6 font-medium text-deloitte-black">${d.vendor}</td>
        <td class="py-3 px-6 text-deloitte-coolGray">${d.amount}</td>
        <td class="py-3 px-6">
          <span class="px-2 py-1 rounded font-bold text-xs ${scoreClass}">${d.score}</span>
        </td>
        <td class="py-3 px-6">
          <span class="px-2 py-1 bg-deloitte-canvas border border-deloitte-lightGray text-deloitte-coolGray text-[10px] rounded font-mono cursor-pointer hover:bg-gray-200">${d.json}</span>
        </td>
        <td class="py-3 px-6 text-right">
          <button class="text-deloitte-blue hover:text-deloitte-darkTeal font-semibold text-xs transition-colors">View Full Record</button>
        </td>
      </tr>
    `;
  }).join('');
}

// --- 2. Chatbot Logic ---
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const chatWindow = document.getElementById('chat-window');
  if (chatOpen) {
    chatWindow.classList.remove('hidden');
    // small timeout to allow display:block to apply before animating opacity
    setTimeout(() => {
      chatWindow.classList.remove('translate-y-4', 'opacity-0');
      chatWindow.classList.add('translate-y-0', 'opacity-100');
    }, 10);
  } else {
    chatWindow.classList.remove('translate-y-0', 'opacity-100');
    chatWindow.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => {
      chatWindow.classList.add('hidden');
    }, 300);
  }
}

const assistantData = {
  initialMessage: "<strong>Hello, How can I assist You Today?</strong><br>",
  suggestions: [
    "Summarize financial impact", 
    "Show historical vendor anomalies", 
    "Draft escalation email"
  ],
  context: {
    recordHtml: ``,
    evidenceLinks: []
  }
};

const history = document.getElementById('chat-history');
const suggestionsBox = document.getElementById('chat-suggestions');
const inputField = document.getElementById('chat-input');

function initAssistant() {
  appendMessage('bot', assistantData.initialMessage);
  assistantData.suggestions.forEach(s => {
    suggestionsBox.innerHTML += `<button class="px-3 py-1 bg-white border border-deloitte-green text-deloitte-green hover:bg-deloitte-green hover:text-white rounded-full text-xs font-semibold transition-colors" onclick="fillInput('${s}')">${s}</button>`;
  });
  
  // Render table data
  renderTable();
}

function appendMessage(sender, text) {
  const isUser = sender === 'user';
  const msgDiv = document.createElement('div');
  msgDiv.className = isUser 
    ? 'ml-auto max-w-[85%] bg-deloitte-green text-white p-3 rounded-lg rounded-tr-none' 
    : 'mr-auto max-w-[85%] bg-white border border-deloitte-lightGray text-deloitte-black p-3 rounded-lg rounded-tl-none';
  msgDiv.innerHTML = text;
  history.appendChild(msgDiv);
  history.scrollTop = history.scrollHeight;
}

function fillInput(text) {
    if (suggestionsBox) suggestionsBox.style.display = "none";
    inputField.value = text;
    inputField.focus();
}

function parseMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/^### (.*$)/gim, '<h3 class="font-bold text-md mt-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-2">$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/`(.*?)`/gim, '<code class="bg-[#F3F4F6] px-1 py-0.5 rounded text-[#D32F2F] font-mono text-sm">$1</code>')
        .replace(/\n/gim, '<br>');
}

async function sendMessage(text) {
    if (!text) return;

    appendMessage('user', `<b>You:</b> ${text}`);
    inputField.value = ''; 
    
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'mr-auto max-w-[85%] bg-deloitte-canvas text-deloitte-coolGray p-3 rounded-lg rounded-tl-none animate-pulse border border-deloitte-lightGray';
    loadingDiv.innerHTML = `<i>Thinking...</i>`;
    history.appendChild(loadingDiv);
    history.scrollTop = history.scrollHeight;

    // Secretly attach the context to the prompt sent to the LLM
    const contextString = assistantData.context.recordHtml ? `\n\n[System Note: The user is currently viewing the following record context: ${assistantData.context.recordHtml}]` : '';
    const payloadText = text + contextString;

    try {
        const response = await fetch('https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/a70f8f8e-a621-47a6-a7c9-20dd347bf0e5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: payloadText }) 
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        const replyText = data.text || data.answer || JSON.stringify(data); 
        const formattedReply = parseMarkdown(replyText);

        appendMessage('bot', formattedReply);

    } catch (error) {
        document.getElementById(loadingId).remove();
        appendMessage('bot', `<span class="text-[#D32F2F] text-xs"><b>System Error:</b> Could not reach AI (${error.message}).</span>`);
    }
}

inputField.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage(inputField.value);
  }
});

// --- 3. Appsmith Integration ---
appsmith.onReady(() => {
    initAssistant();
});

// Listen for dynamic changes from the rest of your Appsmith app
appsmith.onModelChange((model) => {
    if (model.selectedRecord) {
        assistantData.context.recordHtml = `<strong>Selected:</strong> ${model.selectedRecord.id} (${model.selectedRecord.vendor})`;
        console.log("Chatbot context updated with:", model.selectedRecord);
        if (!chatOpen) toggleChat();
    }
});

// Expose globals to window so inline onclicks work inside Appsmith iframes
window.fillInput = fillInput;
window.toggleChat = toggleChat;
```

---

## 2. Audit Workspace Widget

### HTML
```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          deloitte: {
            green: '#86BC25',
            black: '#0F0B0B',
            white: '#FFFFFF',
            coolGray: '#75787B',
            lightGray: '#D0D0CE',
            blue: '#00A3E0',
            darkTeal: '#004F59',
            canvas: '#FBFBFB'
          }
        }
      }
    }
  }
</script>

<div class="h-full flex flex-col animate-in fade-in duration-500 bg-deloitte-canvas p-6 text-deloitte-black font-sans" style="height: 100vh;">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">Unified Audit Workspace</h2>
  </div>
  
  <div class="flex-1 flex gap-6 min-h-0">
    <!-- Left Panel: Queue -->
    <div class="w-80 flex flex-col gap-4 bg-white border border-deloitte-lightGray rounded-xl p-4 overflow-hidden shadow-sm">
      <h3 class="font-semibold text-deloitte-black">Review Queue</h3>
      <div class="relative">
        <input type="text" placeholder="Search exceptions..." class="w-full pl-8 pr-4 py-2 bg-deloitte-canvas border border-deloitte-lightGray rounded-lg text-sm focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green" />
        <i data-lucide="file-search" class="absolute left-2.5 top-2.5 text-deloitte-coolGray w-4 h-4"></i>
      </div>
      <div class="flex-1 overflow-auto space-y-2 pr-2" id="queue-list">
         <!-- Queue items injected via JS -->
      </div>
    </div>

    <!-- Main Panel -->
    <div class="flex-1 flex flex-col gap-4 min-h-0">
      
      <!-- Explainable AI -->
      <div class="bg-white rounded-xl shadow-sm border border-deloitte-lightGray p-6 flex-none bg-gradient-to-r from-deloitte-canvas to-white">
        <h3 class="text-sm font-bold text-deloitte-black mb-2 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-deloitte-green animate-pulse"></span>
          AI Reasoning ("Why Flagged?")
        </h3>
        <p class="text-deloitte-coolGray text-sm leading-relaxed">
          The invoice amount of <strong class="text-deloitte-black">$45,000</strong> exceeds the associated PO-4412 limit of <strong class="text-deloitte-black">$40,000</strong>. Furthermore, the GSTIN profile for <em class="text-deloitte-black">TechCorp Logistics</em> indicates a "Suspended" status as of 2 days ago. <a href="#" class="text-deloitte-blue hover:text-deloitte-darkTeal underline text-xs ml-1 transition-colors">[View DB Evidence]</a>
        </p>
      </div>

      <!-- 3-Way Match & Chain of Evidence -->
      <div class="flex-1 grid grid-rows-2 gap-4 min-h-0">
         <div class="bg-white rounded-xl shadow-sm border border-deloitte-lightGray p-6 overflow-auto flex flex-col">
           <h3 class="text-lg font-semibold text-deloitte-black mb-4">3-Way Match Overview</h3>
           <div class="flex-1 flex gap-4">
              <div class="flex-1 bg-deloitte-canvas rounded border border-deloitte-lightGray p-4">
                <h4 class="text-xs font-bold text-deloitte-coolGray uppercase tracking-wider mb-2">Purchase Order</h4>
                <div class="text-sm font-mono space-y-1 text-deloitte-black">
                  <p>ID: PO-4412</p>
                  <p>Total: $40,000</p>
                  <p>Status: Approved</p>
                </div>
              </div>
              <div class="flex-1 bg-deloitte-canvas rounded border border-deloitte-lightGray p-4">
                <h4 class="text-xs font-bold text-deloitte-coolGray uppercase tracking-wider mb-2">Goods Receipt (GRN)</h4>
                <div class="text-sm font-mono space-y-1 text-deloitte-black">
                  <p>ID: GRN-881</p>
                  <p>Total: $40,000</p>
                  <p>Match: TRUE</p>
                </div>
              </div>
              <div class="flex-1 bg-[#FFEBEE] border-[#FFCDD2] rounded border p-4">
                <h4 class="text-xs font-bold text-[#D32F2F] uppercase tracking-wider mb-2">Invoice</h4>
                <div class="text-sm font-mono space-y-1 text-[#B71C1C]">
                  <p>ID: INV-9921</p>
                  <p class="font-bold border-b border-[#EF9A9A] inline-block">Total: $45,000</p>
                  <p>Match: FALSE</p>
                </div>
              </div>
           </div>
         </div>
         
         <div class="bg-white rounded-xl shadow-sm border border-deloitte-lightGray p-6 overflow-auto">
           <h3 class="text-lg font-semibold text-deloitte-black mb-4">Chain of Evidence (ISA 230)</h3>
           <div class="space-y-4">
              <div class="flex gap-4 items-start">
                <div class="w-2 h-2 rounded-full bg-deloitte-lightGray mt-1.5 flex-none"></div>
                <div>
                  <p class="text-sm text-deloitte-black font-medium">Data Ingested via Kafka</p>
                  <p class="text-xs text-deloitte-coolGray">2026-05-02 10:15:00 UTC</p>
                </div>
              </div>
              <div class="flex gap-4 items-start">
                <div class="w-2 h-2 rounded-full bg-deloitte-green mt-1.5 flex-none"></div>
                <div>
                  <p class="text-sm text-deloitte-black font-medium">Flowise Agent 1 Evaluated Ruleset</p>
                  <p class="text-xs text-deloitte-coolGray">2026-05-02 10:15:02 UTC</p>
                </div>
              </div>
              <div class="flex gap-4 items-start border-l-2 border-dashed border-deloitte-lightGray ml-1 pl-3 h-4 -my-3"></div>
              <div class="flex gap-4 items-start">
                <div class="w-2 h-2 rounded-full bg-[#F9A825] mt-1.5 flex-none -ml-1"></div>
                <div>
                  <p class="text-sm text-deloitte-black font-medium">Escalated to HITL Queue</p>
                  <p class="text-xs text-deloitte-coolGray">2026-05-02 10:15:05 UTC</p>
                </div>
              </div>
           </div>
         </div>
      </div>

      <!-- Action Bar -->
      <div class="bg-white border border-deloitte-lightGray rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
        <input type="text" placeholder="Required: Enter justification for action..." class="flex-1 px-4 py-2 bg-deloitte-canvas border border-deloitte-lightGray rounded-lg text-sm focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green" />
        <div class="flex gap-2">
          <button class="px-4 py-2 bg-white border border-deloitte-lightGray hover:bg-gray-50 text-deloitte-black rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">Contact Vendor</button>
          <button class="px-4 py-2 bg-[#FFF8E1] text-[#F9A825] hover:bg-[#FFECB3] rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">Escalate</button>
          <button class="px-4 py-2 bg-[#FFEBEE] text-[#D32F2F] hover:bg-[#FFCDD2] rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">Reject</button>
          <button class="px-4 py-2 bg-deloitte-green text-white hover:bg-[#75A320] rounded-lg text-sm font-semibold transition-colors shadow-md">Approve / Override</button>
        </div>
      </div>

    </div>
  </div>

  <!-- Chatbot UI -->
  <div id="chatbot-wrapper" class="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
    <!-- Chat Window -->
    <div id="chat-window" class="w-80 bg-white border border-deloitte-lightGray shadow-2xl rounded-2xl flex-col overflow-hidden hidden transition-all duration-300 transform translate-y-4 opacity-0">
      <div class="bg-deloitte-black text-white p-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <i data-lucide="bot" class="w-5 h-5 text-deloitte-green"></i>
          <h3 class="font-bold">AuditIQ Assistant</h3>
        </div>
        <button onclick="toggleChat()" class="text-deloitte-lightGray hover:text-white transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
      <div id="chat-body" class="flex flex-col h-[400px]">
        <div id="chat-history" class="flex-1 overflow-auto p-4 space-y-4 text-sm bg-deloitte-canvas"></div>
        <div id="chat-suggestions" class="px-4 pb-2 flex flex-wrap gap-2 bg-deloitte-canvas"></div>
        <div class="p-3 border-t border-deloitte-lightGray bg-white">
          <input type="text" id="chat-input" placeholder="Ask AI..." class="w-full px-3 py-2 border border-deloitte-lightGray rounded-lg text-sm focus:outline-none focus:border-deloitte-green focus:ring-1 focus:ring-deloitte-green" />
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <button id="chat-fab" onclick="toggleChat()" class="w-14 h-14 bg-deloitte-green hover:bg-[#75A320] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105">
      <i data-lucide="message-square" class="w-6 h-6"></i>
    </button>
  </div>
</div>
```

### CSS
```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D0D0CE; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #75787B; }
```

### JavaScript
```javascript
// Initialize Icons
lucide.createIcons();

// --- 1. Mock Queue Data ---
const queueData = [
  { id: "INV-9921", score: 98, vendor: "TechCorp Logistics" },
  { id: "PO-4412", score: 85, vendor: "Global Supplies Inc." },
  { id: "INV-1102", score: 81, vendor: "Apex Solutions" },
  { id: "GRN-0922", score: 75, vendor: "Prime Manufacturing" },
];

function renderQueue() {
  const qList = document.getElementById('queue-list');
  qList.innerHTML = queueData.map((item, i) => {
    let bgClass = i === 0 ? 'bg-[#F9FBE7] border-deloitte-green shadow-sm' : 'bg-white border-deloitte-lightGray hover:border-deloitte-coolGray';
    let scoreClass = item.score > 90 ? 'text-[#D32F2F] bg-[#FFEBEE]' : 'text-[#F9A825] bg-[#FFF8E1]';
    return `
      <div class="p-3 rounded-lg border cursor-pointer transition-colors ${bgClass}">
         <div class="flex justify-between items-center mb-1">
           <span class="font-semibold text-sm text-deloitte-black">${item.id}</span>
           <span class="text-xs font-bold px-2 py-0.5 rounded ${scoreClass}">${item.score} Risk</span>
         </div>
         <p class="text-xs text-deloitte-coolGray">${item.vendor}</p>
      </div>
    `;
  }).join('');
}

// --- 2. Chatbot Logic ---
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const chatWindow = document.getElementById('chat-window');
  if (chatOpen) {
    chatWindow.classList.remove('hidden');
    setTimeout(() => {
      chatWindow.classList.remove('translate-y-4', 'opacity-0');
      chatWindow.classList.add('translate-y-0', 'opacity-100');
    }, 10);
  } else {
    chatWindow.classList.remove('translate-y-0', 'opacity-100');
    chatWindow.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => {
      chatWindow.classList.add('hidden');
    }, 300);
  }
}

const assistantData = {
  initialMessage: "<strong>Hello, How can I assist You Today?</strong><br>",
  suggestions: [
    "Summarize financial impact", 
    "Draft escalation email to VEND1011"
  ],
  context: {
    recordHtml: ``,
    evidenceLinks: []
  }
};

const history = document.getElementById('chat-history');
const suggestionsBox = document.getElementById('chat-suggestions');
const inputField = document.getElementById('chat-input');

function initAssistant() {
  appendMessage('bot', assistantData.initialMessage);
  assistantData.suggestions.forEach(s => {
    suggestionsBox.innerHTML += `<button class="px-3 py-1 bg-white border border-deloitte-green text-deloitte-green hover:bg-deloitte-green hover:text-white rounded-full text-xs font-semibold transition-colors" onclick="fillInput('${s}')">${s}</button>`;
  });
  renderQueue();
}

function appendMessage(sender, text) {
  const isUser = sender === 'user';
  const msgDiv = document.createElement('div');
  msgDiv.className = isUser 
    ? 'ml-auto max-w-[85%] bg-deloitte-green text-white p-3 rounded-lg rounded-tr-none' 
    : 'mr-auto max-w-[85%] bg-white border border-deloitte-lightGray text-deloitte-black p-3 rounded-lg rounded-tl-none';
  msgDiv.innerHTML = text;
  history.appendChild(msgDiv);
  history.scrollTop = history.scrollHeight;
}

function fillInput(text) {
    if (suggestionsBox) suggestionsBox.style.display = "none";
    inputField.value = text;
    inputField.focus();
}

function parseMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/^### (.*$)/gim, '<h3 class="font-bold text-md mt-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-2">$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/`(.*?)`/gim, '<code class="bg-[#F3F4F6] px-1 py-0.5 rounded text-[#D32F2F] font-mono text-sm">$1</code>')
        .replace(/\n/gim, '<br>');
}

async function sendMessage(text) {
    if (!text) return;

    appendMessage('user', `<b>You:</b> ${text}`);
    inputField.value = ''; 
    
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'mr-auto max-w-[85%] bg-deloitte-canvas text-deloitte-coolGray p-3 rounded-lg rounded-tl-none animate-pulse border border-deloitte-lightGray';
    loadingDiv.innerHTML = `<i>Thinking...</i>`;
    history.appendChild(loadingDiv);
    history.scrollTop = history.scrollHeight;

    // Seamlessly attach context to the question payload
    const contextString = assistantData.context.recordHtml ? `\n\n[System Note: The user is currently viewing the following record context: ${assistantData.context.recordHtml}]` : '';
    const payloadText = text + contextString;

    try {
        const response = await fetch('https://agentbuilder3.ingenw-innovation-nonprod.deloitte.com/api/v1/prediction/a70f8f8e-a621-47a6-a7c9-20dd347bf0e5', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: payloadText }) 
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        const replyText = data.text || data.answer || JSON.stringify(data); 
        const formattedReply = parseMarkdown(replyText);

        appendMessage('bot', formattedReply);

    } catch (error) {
        document.getElementById(loadingId).remove();
        appendMessage('bot', `<span class="text-[#D32F2F] text-xs"><b>System Error:</b> Could not reach AI (${error.message}).</span>`);
    }
}

inputField.addEventListener("keypress", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage(inputField.value);
  }
});

// --- 3. Appsmith Integration ---
appsmith.onReady(() => {
    initAssistant();
});

appsmith.onModelChange((model) => {
    if (model.activeAuditId) {
        assistantData.context.recordHtml = `<strong>Active Audit ID:</strong> ${model.activeAuditId}`;
        
        // Let's say Appsmith passes full record details:
        if (model.activeAuditData) {
           assistantData.context.recordHtml += ` | Vendor: ${model.activeAuditData.vendor} | Score: ${model.activeAuditData.score}`;
        }
        
        console.log("Updated AI context to:", assistantData.context.recordHtml);
    }
});

window.fillInput = fillInput;
window.toggleChat = toggleChat;
```
