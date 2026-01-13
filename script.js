// ====== 模型列表（按公司分组）======
const MODEL_LIST = [
  // OpenAI
  { name: "GPT-5.2", company: "openai" },
  { name: "GPT-5.1", company: "openai" },
  { name: "GPT-5.1 Thinking", company: "openai" },
  { name: "GPT-5.2 Codex", company: "openai" },
  { name: "GPT-5.2 Chat Latest", company: "openai" },
  
  // Anthropic
  { name: "Claude Opus 4.5", company: "anthropic" },
  
  // Google
  { name: "Gemini 3 Pro Preview", company: "google" },
  { name: "Gemini 3 Pro Preview 11-2025", company: "google" },
  { name: "Gemini 3 Pro Preview Thinking", company: "google" },
  
  // xAI
  { name: "Grok-4.1", company: "xai" }
];

const loginBox = document.getElementById("loginBox");
const chatBox = document.getElementById("chatBox");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginTip = document.getElementById("loginTip");

const companySelect = document.getElementById("companySelect");
const modelSelect = document.getElementById("modelSelect");
const clearBtn = document.getElementById("clearBtn");
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let chatHistory = [];
let currentCompany = "all";

// ====== 初始化模型列表 ======
function initModels() {
  updateModelList();
}

// ====== 根据公司筛选更新模型列表 ======
function updateModelList() {
  const filtered = currentCompany === "all" 
    ? MODEL_LIST 
    : MODEL_LIST.filter(m => m.company === currentCompany);
  
  modelSelect.innerHTML = "";
  
  if (filtered.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "该公司暂无模型";
    modelSelect.appendChild(opt);
    return;
  }
  
  for (const model of filtered) {
    const opt = document.createElement("option");
    opt.value = model.name;
    opt.textContent = model.name;
    modelSelect.appendChild(opt);
  }
}

// ====== 公司选择器事件 ======
companySelect.addEventListener("change", (e) => {
  currentCompany = e.target.value;
  updateModelList();
});

// ====== 添加消息到聊天界面 ======
function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "ai"}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ====== 设置界面忙碌状态 ======
function setBusy(busy) {
  sendBtn.disabled = busy;
  userInput.disabled = busy;
  modelSelect.disabled = busy;
  companySelect.disabled = busy;
  clearBtn.disabled = busy;
}

// ====== 加载登录状态 ======
function loadLoginState() {
  const ok = localStorage.getItem("AUTH_OK");
  if (ok === "1") {
    loginBox.classList.add("hidden");
    chatBox.classList.remove("hidden");
  }
}

// ====== 登录按钮事件 ======
loginBtn.addEventListener("click", async () => {
  loginTip.textContent = "";
  const pwd = passwordInput.value.trim();
  if (!pwd) {
    loginTip.textContent = "请输入密码";
    return;
  }

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "check_password",
        password: pwd
      })
    });

    const data = await resp.json();

    if (resp.ok && data.ok) {
      localStorage.setItem("AUTH_OK", "1");
      loginBox.classList.add("hidden");
      chatBox.classList.remove("hidden");
    } else {
      loginTip.textContent = data.error || "密码错误";
    }
  } catch (e) {
    loginTip.textContent = "网络错误：" + String(e);
  }
});

// ====== 清空对话按钮 ======
clearBtn.addEventListener("click", () => {
  if (confirm("确定要清空所有对话记录吗？")) {
    chatHistory = [];
    messagesEl.innerHTML = "";
  }
});

// ====== 发送按钮事件 ======
sendBtn.addEventListener("click", sendMessage);

// ====== 回车发送（Shift+回车换行）======
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ====== 发送消息函数 ======
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // 🔒 防抖：如果按钮被禁用，拒绝发送
  if (sendBtn.disabled) {
    addMessage("ai", "⚠️ 请等待上一条消息完成后再发送");
    return;
  }

  userInput.value = "";
  addMessage("user", text);

  chatHistory.push({ role: "user", content: text });

  const modelDisplayName = modelSelect.value;
  if (!modelDisplayName) {
    addMessage("ai", "❌ 请先选择一个模型");
    return;
  }
  
  setBusy(true);

  // 添加临时"正在请求"提示
  const tempDiv = document.createElement("div");
  tempDiv.className = "msg ai";
  tempDiv.textContent = "⏳ 正在请求，请稍候...";
  messagesEl.appendChild(tempDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat",
        model: modelDisplayName,
        messages: chatHistory
      })
    });

    const data = await resp.json();

    // 移除临时提示
    tempDiv.remove();

    if (!resp.ok) {
      addMessage("ai", `❌ ${data.error || "未知错误"}`);
      if (data.detail) {
        console.error("详细错误：", data.detail);
        addMessage("ai", `💡 ${data.detail}`);
      }
      setBusy(false);
      return;
    }

    const aiText = data.text || "";
    addMessage("ai", aiText);

    // 显示使用的 token 信息（调试用）
    if (data.token_used) {
      console.log(`✅ 模型: ${modelDisplayName} | Token: ${data.token_used}`);
    }

    // 如果经过多次重试才成功，显示提示
    if (data.attempts && data.attempts > 1) {
      addMessage("ai", `💡 模型繁忙，已自动重试 ${data.attempts} 次后成功`);
    }

    chatHistory.push({ role: "assistant", content: aiText });

  } catch (e) {
    tempDiv.remove();
    addMessage("ai", "❌ 网络错误：" + String(e));
  } finally {
    setBusy(false);
  }
}

// ====== 初始化 ======
initModels();
loadLoginState();
