// ========================================
// ⚙️ 配置区域 - 只需要修改这里
// ========================================

const CORRECT_PASSWORD = '123456';  // ← 改成你的密码
const MAX_ATTEMPTS = 5;             // 最多允许尝试5次
const LOCKOUT_TIME = 300;           // 锁定5分钟（秒）
const SHOW_CAPTCHA_AFTER = 3;       // 失败3次后显示验证码

// ========================================
// 下面的代码不要修改
// ========================================

const STORAGE_KEYS = {
    attempts: 'login_attempts',
    lockoutUntil: 'lockout_until',
    lastAttemptTime: 'last_attempt_time'
};

let currentCaptcha = '';
let isLocked = false;

window.onload = function() {
    checkLockoutStatus();
    updateAttemptsDisplay();
    
    if (localStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'index.html';
    }
};

function checkLockoutStatus() {
    const lockoutUntil = parseInt(localStorage.getItem(STORAGE_KEYS.lockoutUntil) || '0');
    const now = Date.now();

    if (lockoutUntil > now) {
        isLocked = true;
        startLockoutTimer(lockoutUntil);
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('password').disabled = true;
        return true;
    } else {
        isLocked = false;
        localStorage.removeItem(STORAGE_KEYS.lockoutUntil);
        return false;
    }
}

function startLockoutTimer(lockoutUntil) {
    const timerElement = document.getElementById('lockoutTimer');
    const warningElement = document.getElementById('warningMessage');
    
    timerElement.classList.add('show');
    warningElement.classList.add('show');
    warningElement.textContent = '⚠️ 由于多次登录失败，账户已被临时锁定';

    const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
        
        if (remaining > 0) {
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            timerElement.textContent = `请等待 ${minutes}:${seconds.toString().padStart(2, '0')} 后重试`;
        } else {
            clearInterval(interval);
            timerElement.classList.remove('show');
            warningElement.classList.remove('show');
            document.getElementById('submitBtn').disabled = false;
            document.getElementById('password').disabled = false;
            isLocked = false;
            resetAttempts();
        }
    }, 1000);
}

function generateCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    currentCaptcha = '';
    for (let i = 0; i < 4; i++) {
        currentCaptcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('captchaDisplay').textContent = currentCaptcha;
}

window.refreshCaptcha = function() {
    generateCaptcha();
    document.getElementById('captchaInput').value = '';
};

function updateAttemptsDisplay() {
    const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.attempts) || '0');
    const remaining = MAX_ATTEMPTS - attempts;
    const infoElement = document.getElementById('attemptsInfo');
    
    if (attempts > 0) {
        infoElement.textContent = `剩余尝试次数：${remaining}`;
        
        if (attempts >= SHOW_CAPTCHA_AFTER) {
            document.getElementById('captchaContainer').classList.add('show');
            if (!currentCaptcha) generateCaptcha();
        }
    }
}

function incrementAttempts() {
    const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.attempts) || '0') + 1;
    localStorage.setItem(STORAGE_KEYS.attempts, attempts);
    localStorage.setItem(STORAGE_KEYS.lastAttemptTime, Date.now());

    if (attempts >= MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + (LOCKOUT_TIME * 1000);
        localStorage.setItem(STORAGE_KEYS.lockoutUntil, lockoutUntil);
        checkLockoutStatus();
    }

    updateAttemptsDisplay();
}

function resetAttempts() {
    localStorage.removeItem(STORAGE_KEYS.attempts);
    localStorage.removeItem(STORAGE_KEYS.lastAttemptTime);
    updateAttemptsDisplay();
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        if (isLocked) return;

        const password = document.getElementById('password').value;
        const captchaInput = document.getElementById('captchaInput').value.toUpperCase();
        const errorElement = document.getElementById('errorMessage');

        if (document.getElementById('captchaContainer').classList.contains('show')) {
            if (!captchaInput || captchaInput !== currentCaptcha) {
                errorElement.textContent = '❌ 验证码错误';
                errorElement.classList.add('show');
                window.refreshCaptcha();
                return;
            }
        }

        if (password === CORRECT_PASSWORD) {
            localStorage.setItem('isLoggedIn', 'true');
            resetAttempts();
            window.location.href = 'index.html';
        } else {
            errorElement.textContent = '❌ 密码错误';
            errorElement.classList.add('show');
            incrementAttempts();
            window.refreshCaptcha();
            
            document.getElementById('password').value = '';
            document.getElementById('captchaInput').value = '';
        }
    });

    document.getElementById('password').addEventListener('input', function() {
        document.getElementById('errorMessage').classList.remove('show');
    });
});
