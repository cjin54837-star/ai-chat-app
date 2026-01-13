// ====== 模型列表 ======
const MODEL_LIST = [
  "GPT-5.2",
  "GPT-5.1",
  "GPT-5.1 Thinking",
  "GPT-5.2 Codex",
  "GPT-5.2 Chat Latest",
  "Claude Opus 4.5",
  "Gemini 3 Pro Preview",           // ✅ 新增
  "Gemini 3 Pro Preview 11-2025",   // ✅ 新增
  "Gemini 3 Pro Preview Thinking",  // ✅ 新增
  "Grok-4.1"
];

const loginBox = document.getElementById("loginBox");
const chatBox = document.getElementById("chatBox");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginTip = document.getElementById("loginTip");

const modelSelect = document.getElementById("modelSelect");
const clearBtn = document.getElementById("clearBtn");
const messagesEl = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

let chatHistory = [];

// ====== 初始化模型列表 ======
function initModels() {
  modelSelect.innerHTML = "";
  for (const name of MODEL_LIST) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    modelSelect.appendChild(opt);
  }
  modelSelect.value = "GPT-5.2";
}

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
  chatHistory = [];
  messagesEl.innerHTML = "";
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
        addMessage("ai", `💡 提示：${data.detail}`);
      }
      setBusy(false);
      return;
    }

    const aiText = data.text || "";
    addMessage("ai", aiText);

    // 显示使用的 token 信息（调试用）
    if (data.token_used) {
      console.log(`✅ 使用的 Token: ${data.token_used}`);
    }

    // 如果经过多次重试才成功，显示提示
    if (data.attempts && data.attempts > 1) {
      addMessage("ai", `💡 提示：模型刚才繁忙，已自动重试 ${data.attempts} 次后成功。`);
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
