// ====== 模型配置映射 ======
const MODEL_MAP = {
  // OpenAI 模型（用 YUNWU_API_KEY - 逆向分组）
  "GPT-5.2": { type: "chat", model: "gpt-5.2", tokenGroup: "reverse" },
  "GPT-5.1": { type: "chat", model: "gpt-5.1", tokenGroup: "reverse" },
  "GPT-5.1 Thinking": { type: "chat", model: "gpt-5.1-thinking-all", tokenGroup: "reverse" },
  "GPT-5.2 Codex": { type: "chat", model: "gpt-5-codex", tokenGroup: "reverse" },
  "GPT-5.2 Chat Latest": { type: "chat", model: "gpt-5.2-chat-latest", tokenGroup: "reverse" },
  
  // Anthropic 模型（用 YUNWU_API_KEY - 逆向分组）
  "Claude Opus 4.5": { type: "chat", model: "claude-opus-4-5-20251101", tokenGroup: "reverse" },
  
  // xAI 模型（用 YUNWU_API_KEY - 逆向分组）
  "Grok-4.1": { type: "chat", model: "grok-4.1", tokenGroup: "reverse" },

  // Google Gemini 3.0 模型（用专用 token）
  "Gemini 3 Pro Preview": { type: "chat", model: "gemini-3-pro-preview", tokenGroup: "gemini" },
  "Gemini 3 Pro Preview 11-2025": { type: "chat", model: "gemini-3-pro-preview-11-2025", tokenGroup: "gemini" },
  "Gemini 3 Pro Preview Thinking": { type: "chat", model: "gemini-3-pro-preview-thinking", tokenGroup: "gemini" }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // ====== 读取环境变量 ======
  const reverseKey = process.env.YUNWU_API_KEY;
  const geminiPromoKey = process.env.YUNWU_GEMINI_PROMO_KEY;
  const geminiPremiumKey = process.env.YUNWU_GEMINI_PREMIUM_KEY;
  const accessPassword = process.env.ACCESS_PASSWORD || "";

  if (!reverseKey) {
    return res.status(500).json({ ok: false, error: "Missing YUNWU_API_KEY" });
  }

  try {
    const body = req.body || {};
    const action = body.action;

    // ====== 密码验证 ======
    if (action === "check_password") {
      const pwd = String(body.password || "");
      if (!accessPassword) {
        return res.status(500).json({ ok: false, error: "Missing ACCESS_PASSWORD" });
      }
      if (pwd === accessPassword) return res.status(200).json({ ok: true });
      return res.status(401).json({ ok: false, error: "密码错误" });
    }

    if (action !== "chat") {
      return res.status(400).json({ ok: false, error: "Unknown action" });
    }

    // ====== 获取模型配置 ======
    const displayName = String(body.model || "");
    const cfg = MODEL_MAP[displayName];

    if (!cfg) {
      return res.status(400).json({ ok: false, error: `不支持的模型：${displayName}` });
    }

    const realModelId = cfg.model;
    const tokenGroup = cfg.tokenGroup;
    const messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ ok: false, error: "messages required" });
    }

    // ====== 根据 tokenGroup 选择 Token 列表 ======
    let tokenList = [];
    if (tokenGroup === "gemini") {
      if (geminiPromoKey) tokenList.push({ key: geminiPromoKey, name: "限时特价" });
      if (geminiPremiumKey) tokenList.push({ key: geminiPremiumKey, name: "优质gemini" });
      
      if (tokenList.length === 0) {
        return res.status(500).json({ 
          ok: false, 
          error: "Missing Gemini tokens" 
        });
      }
    } else {
      tokenList.push({ key: reverseKey, name: "逆向" });
    }

    // ====== 自动重试逻辑 ======
    const MAX_RETRIES_PER_TOKEN = 2;
    let lastError = "";
    let tokenUsed = "";

    for (const tokenInfo of tokenList) {
      const apiKey = tokenInfo.key;
      const tokenName = tokenInfo.name;

      for (let attempt = 1; attempt <= MAX_RETRIES_PER_TOKEN; attempt++) {
        try {
          const r = await fetch("https://yunwu.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: realModelId,
              messages,
              temperature: 0.7
            })
          });

          const data = await r.json();

          // 特殊处理 429
          if (r.status === 429) {
            lastError = "429 Too Many Requests";
            console.log(`⚠️ [${tokenName}] 遇到 429，尝试下一个 token...`);
            break;
          }

          // 特殊处理 Invalid token
          if (data?.error?.message?.includes("Invalid token")) {
            lastError = `Invalid token (${tokenName})`;
            console.log(`❌ [${tokenName}] Token 无效`);
            break;
          }

          const text = data?.choices?.[0]?.message?.content ?? "";

          if (r.ok && text) {
            tokenUsed = tokenName;
            return res.status(200).json({
              ok: true,
              model: displayName,
              text,
              token_used: tokenUsed,
              attempts: (tokenList.indexOf(tokenInfo) * MAX_RETRIES_PER_TOKEN) + attempt
            });
          }

          lastError = data?.error?.message || JSON.stringify(data);

          const isRetryable =
            lastError.includes("负载已饱和") ||
            lastError.includes("upstream");

          if (!isRetryable) {
            console.log(`❌ [${tokenName}] 不可重试: ${lastError}`);
            break;
          }

          if (attempt < MAX_RETRIES_PER_TOKEN) {
            const delay = Math.pow(2, attempt) * 1000;
            await sleep(delay);
          }

        } catch (e) {
          lastError = String(e);
        }
      }
    }

    return res.status(503).json({
      ok: false,
      error: `所有渠道均失败，请稍后再试`,
      detail: lastError
    });

  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
