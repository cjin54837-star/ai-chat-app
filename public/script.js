// 设置正确的密码
const CORRECT_PASSWORD = "123"; 

// 获取页面元素
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatBox = document.getElementById('chat-box');

// 1. 登录功能
loginBtn.addEventListener('click', function() {
    const inputVal = passwordInput.value;
    
    if (inputVal === CORRECT_PASSWORD) {
        // 密码正确：隐藏登录页，显示聊天页
        loginContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    } else {
        // 密码错误
        errorMsg.textContent = "密码错误，请重试";
        passwordInput.value = ""; // 清空输入框
    }
});

// 支持回车键登录
passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loginBtn.click();
    }
});

// 2. 发送消息功能
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return; // 如果是空的就不发送

    // 添加用户消息
    addMessage(text, 'user-message');
    userInput.value = ""; // 清空输入框

    // 模拟 AI 回复 (延迟 1 秒)
    setTimeout(() => {
        addMessage("收到！但我目前只是一个前端演示界面，还没有接入真的 AI 大脑哦。", 'ai-message');
    }, 1000);
}

// 绑定发送按钮
sendBtn.addEventListener('click', sendMessage);

// 支持回车键发送
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 工具函数：在界面上添加消息气泡
function addMessage(text, className) {
    const div = document.createElement('div');
    div.classList.add('message', className);
    div.textContent = text;
    chatBox.appendChild(div);
    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}
