// ====== 模型列表（按公司分组）======
const MODEL_LIST = [
  { name: "GPT-5.2", company: "openai" },
  { name: "GPT-5.1", company: "openai" },
  { name: "GPT-5.1 Thinking", company: "openai" },
  { name: "GPT-5.2 Codex", company: "openai" },
  { name: "GPT-5.2 Chat Latest", company: "openai" },
  { name: "Claude Opus 4.5", company: "anthropic" },
  { name: "Gemini 3 Pro Preview", company: "google" },
  { name: "Gemini 3 Pro Preview 11-2025", company: "google" },
  { name: "Gemini 3 Pro Preview Thinking", company: "google" },
  { name: "Grok-4.1", company: "xai" }
];

// ====== DOM 元素 ======
const loginBox = document.getElementById("loginBox");
const mainBox = document.getElementById("mainBox");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginTip = document.getElementById("loginTip");

// ... 其他代码不变

// ====== 初始化（确保在 DOM 加载完成后执行）======
document.addEventListener('DOMContentLoaded', function() {
  init();
});

function init() {
  loadChatSessions();
  initModels();
  loadLoginState();
  bindEvents();
}

// ====== 登录处理 ======
async function handleLogin() {
  loginTip.textContent = "";
  const pwd = passwordInput.value.trim();
  
  if (!pwd) {
    loginTip.textContent = "请输入密码";
    passwordInput.focus();
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "验证中...";

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
      mainBox.classList.remove("hidden");
      
      // 创建或加载对话
      if (Object.keys(chatSessions).length === 0) {
        createNewChat();
      } else {
        const lastChatId = Object.keys(chatSessions).sort((a, b) => 
          chatSessions[b].timestamp - chatSessions[a].timestamp
        )[0];
        loadChat(lastChatId);
      }
      
      renderHistory();
    } else {
      loginTip.textContent = data.error || "密码错误";
      passwordInput.value = "";
      passwordInput.focus();
    }
  } catch (e) {
    loginTip.textContent = "网络错误：" + String(e);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "进入";
  }
}
