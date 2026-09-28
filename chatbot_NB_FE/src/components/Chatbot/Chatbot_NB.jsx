import React, { useEffect, useRef, useState } from "react";
import useKeyboardAdjust from '../../hooks/useKeyboardAdjust';
import { NavLink, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import { useParams } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import robot from "../../assets/logo A.png";
import styles from "./Chatbot_NB.module.css";

/**
 * ChatbotWidget.jsx
 * Phiên bản cập nhật: lưu message vào DB khi user gửi và khi bot trả lời
 */

const SvgIcon = ({ path }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} viewBox="0 0 15 15" fill="currentColor">
    <path d={path} />
  </svg>
);

// --- Simple formatter: escape HTML and convert a small subset of Markdown to HTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(md) {
  if (!md) return '';
  let text = String(md);

  // Normalize repeated newlines and repeated asterisks to avoid duplicated output
  // normalize CRLF to LF
  text = text.replace(/\r\n/g, '\n');
  // collapse 2 or more consecutive newlines into a single newline
  text = text.replace(/\n{2,}/g, '\n');
  // collapse repeated bold markers like '****' or '** **' into a single '**'
  text = text.replace(/(?:\*\*)(?:\s*\*\*)+/g, '**');
  // collapse runs of 3+ single asterisks into a single '*'
  text = text.replace(/\*{3,}/g, '*');

  // escape first
  text = escapeHtml(text);

  // handle fenced code blocks ```
  const codeBlocks = [];
  text = text.replace(/```(?:[\w-]+)?\n([\s\S]*?)```/g, function(_, code) {
    const idx = codeBlocks.length;
    codeBlocks.push('<pre><code>' + code + '</code></pre>');
    return '___CODEBLOCK' + idx + '___';
  });

  // headings ###, ##, #
  text = text.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>');
  text = text.replace(/^##\s?(.*)$/gm, '<h2>$1</h2>');
  text = text.replace(/^#\s?(.*)$/gm, '<h1>$1</h1>');

  // bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // italics *text*
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // unordered lists: group consecutive lines starting with - or * into a ul
  text = text.replace(/((?:^[ \t]*[-*] .+(?:\n|$))+)/gm, function(block) {
    const items = block.split(/\n/).map(l => l.trim()).filter(Boolean).map(line => line.replace(/^[-*]\s+/, ''));
    return '\n<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
  });

  // convert remaining newlines to <br>
  text = text.replace(/\n/g, '<br>');

  // restore code blocks
  text = text.replace(/___CODEBLOCK(\d+)___/g, function(_, idx) {
    return codeBlocks[Number(idx)];
  });

  return text;
}

const BOT = { id: "bot", name: "Trợ lý ảo" };
const USER = { id: "user", name: "Bạn" };

export default function ChatbotWidget({setConversations}) {
  const [messages, setMessages] = useState([]);
  const { conversationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [user, setUser] = useState(null);
  const [_trainingText, _setTrainingText] = useState([])
  const navigate = useNavigate();
  const listRef = useRef(null);
  const topContainerRef = useRef(null);
  const composerRef = useRef(null);
  const idRef = useRef(100000); // temp id generator for optimistic UI

  useKeyboardAdjust(topContainerRef);

  // --- chuẩn hóa về 1 dạng chuẩn 
  function normalizeRawMessage(raw) {
    // common field names mapping
    const id = raw.id ?? raw.message_id ?? raw.msg_id ?? raw._id ?? (idRef.current++);
    const text = raw.content ?? raw.text ?? raw.body ?? raw.message ?? raw.msg ?? "";
    // sender may be stored differently
    let sender = { id: raw.sender_id ?? raw.senderId ?? raw.sender?.id ?? raw.from ?? "user", name: "" };
    if (raw.sender_name || raw.senderName) sender.name = raw.sender_name ?? raw.senderName;
    else if (raw.sender && typeof raw.sender === "object") sender.name = raw.sender.name ?? raw.sender.fullname ?? raw.sender.displayName ?? String(sender.id);
    else sender.name = String(sender.id) === "bot" ? "Trợ lý ảo" : (raw.sender_name ?? raw.senderName ?? "Bạn");

    // time
    const tRaw = raw.create_time ?? raw.createTime ?? raw.created_at ?? raw.createdAt ?? raw.time ?? raw.timestamp;
    const time = tRaw ? new Date(tRaw).getTime() : Date.now();

    // role (optional)
    const role = (raw.role ?? (String(sender.id).toLowerCase() === "bot" ? "bot" : "user")) ;

    // preserve any already-formatted HTML (if backend provides it)
    const html = raw.html ?? raw.formattedHtml ?? undefined;
    return { id, sender, text, time, role, html };
  }

  // --- Fetch messages for conversation and normalize
  useEffect(() => {
    const token = localStorage.getItem('token') || "";
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // const fetchConcatenatedTexts = async () => {
    //   try {
    //     const res = await fetch(API_ENDPOINTS.DOCUMENT.GETALLTEXTS, {
    //       method: 'GET',
    //       headers: {
    //         Authorization: token ? `Bearer ${token}` : "",
    //         "Content-Type": "application/json",
    //       }
    //     });

    //     if (!res.ok) {
    //       const errText = await res.text();
    //       throw new Error(`Lỗi khi tải dữ liệu training: ${res.status} - ${errText}`);
    //     }

    //     const { data } = await res.json();
    //     setTrainingText(data)
    //   } catch (error) {
    //     console.error('❌ fetchConcatenatedTexts error:', error);
    //     return [];

    //   }
    // };
    // fetchConcatenatedTexts();

    // decode user if token present
    try {
      if (token) {
        const decoded = jwtDecode(token);
        if (decoded) setUser(decoded);
      }
    } catch (err) {
      console.warn("Invalid token for decode", err);
    }

    let mounted = true;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const resp = await fetch(API_ENDPOINTS.CONVERSATIONS.MESSAGES(conversationId), {
          method: 'GET',
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) {
          throw new Error(`Fetch messages failed: ${resp.status}`);
        }
        const data = await resp.json();

        // try to find array of raw messages in common fields
        let rawList = [];
        if (Array.isArray(data.messages)) rawList = data.messages;
        else if (Array.isArray(data.items)) rawList = data.items;
        else if (Array.isArray(data.rows)) rawList = data.rows;
        else if (Array.isArray(data.data)) rawList = data.data;
        else if (Array.isArray(data)) rawList = data;
        else if (data?.messages?.rows && Array.isArray(data.messages.rows)) rawList = data.messages.rows;
        else rawList = [];

        const normalized = rawList.map(normalizeRawMessage);
        // sort ascending by time
        normalized.sort((a, b) => a.time - b.time);

        if (mounted) setMessages(normalized);
      } catch (err) {
        console.error("Error fetching messages:", err);
        if (mounted) setMessages([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMessages();
    
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  // scroll to bottom when messages change or typing flag changes
  // but avoid auto-scrolling if the composer/input is currently focused
  useEffect(() => {
    const t = setTimeout(() => {
      if (!listRef.current) return;
      try {
        const active = document.activeElement;
        // if the composer is focused (or contains the focused element), do not auto-scroll
        if (composerRef.current && (active === composerRef.current || composerRef.current.contains(active))) {
          return;
        }
      } catch {
        // ignore
      }
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 60);
    return () => clearTimeout(t);
  }, [messages, isTyping]);


  // Hàm tạo conversation mới nếu chưa có
async function createConversationIfNeeded() {
  if (conversationId && conversationId !== ':conversationId') return conversationId; // đã có => dùng luôn

  const token = localStorage.getItem("token");

  try {
    const response = await fetch(API_ENDPOINTS.CONVERSATIONS.CREATE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: user.sub,
        title: 'Đoạn chat mới',
        status: 'active',
        create_time: new Date().toISOString()
      }),
    });
    const result = await response.json();

    if (!response.ok) {
        // nếu backend trả về lỗi, show message nếu có
        throw new Error(result.message || 'Không thể tạo đoạn chat mới.');
    }

    // gọi lại api để cập nhật danh sách conversation
    const updatedConver = await fetch(API_ENDPOINTS.CONVERSATIONS.LIST, {
        method: "GET",
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    const updatedData = await updatedConver.json();
    setConversations(updatedData.convers);

    const newId = updatedData.convers[0].id

    // 👉 Chuyển hướng sang URL mới để Router đồng bộ
    navigate(`/chatbot_NB/${newId}`, { replace: false });

    return newId;
  } catch (err) {
    console.error("❌ Lỗi khi tạo conversation mới:", err);
    return null;
  }
}

  // --- Helper: persist message to backend. Returns saved object if backend returns it.
  async function saveMessageToDB(payload) {
    try {
      const token = localStorage.getItem('token') || "";
      const resp = await fetch(API_ENDPOINTS.CONVERSATIONS.CREATE_MESSAGES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(()=>null);
        throw new Error(`Save message failed ${resp.status} ${errText || ""}`);
      }

      // backend may return created message
      const data = await resp.json().catch(()=>null);
      // Common shapes: { data: created }, { message: "...", data: created }, created object directly
      if (data?.data) return data.data;
      if (data?.message && data?.data) return data.data;
      if (data?.id || data?.message_id) return data;
      return null;
    } catch (err) {
      console.error("❌ Lỗi khi lưu message:", err);
      return null;
    }
  }

  // --- Local optimistic add (supports optional pre-formatted HTML)
  function addLocalMessage(senderObj, text, html) {
    const id = idRef.current++;
    const time = Date.now();
    const sender = typeof senderObj === "string" ? { id: senderObj, name: senderObj === "bot" ? "Trợ lý ảo" : (user?.fullname ?? "Bạn") } : senderObj;
    const newMsg = { id, sender, text, time, role: sender.id === "bot" ? "bot" : "user", html };
    setMessages(prev => [...prev, newMsg]);
    return newMsg;
  }

  // --- handle send: optimistic UI -> persist user message -> call Gemini -> persist bot message
  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Kiểm tra và tạo conversation nếu cần
    let converId = conversationId;
    if (!converId || converId === ':conversationId') {
      converId = await createConversationIfNeeded();
      if (!converId) return; // lỗi tạo => dừng
    }

    // optimistic add user message
    const userSender = { id: user?.sub ?? "user", name: user?.fullname ?? "Bạn" };
    addLocalMessage(userSender, text);
    setInput("");

    // prepare payload to save user message
    const seq = (messages.length || 0) + 1;
    const userPayload = {
      conversation_id: converId,
      sender_id: user.sub,
      seq: (seq + 1),
      content: text,
      create_time: new Date().toISOString()
    };

    // persist user message (best-effort)
    await saveMessageToDB(userPayload);
    // optionally you could replace temp id with savedUser.id if returned (not implemented here)

    // call Gemini API to get response
    try {
      setIsTyping(true);
      const resp = await fetch(API_ENDPOINTS.GEMINI.GENERATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: text,
          options: {
            "temperature": 0.3,
            "maxOutputTokens": 4096,
            "documentContext": {
              "enabled": true,
              "limit": 100,
              "offset": 0,
            }
          },
        }),
      });

      if (!resp.ok) {
        throw new Error(`Gemini API error ${resp.status}`);
      }
      const data = await resp.json();
      // Prefer data.text, then data.reply. If the chosen value is empty or only whitespace,
      // fall back to the user-facing message.
      let rawReply = data?.text ?? data?.reply ?? '';
      if (!rawReply || !String(rawReply).trim()) {
        rawReply = "Xin lỗi, tôi chưa trả lời được.";
      }
      const botText = rawReply;
      const formattedHtml = markdownToHtml(botText);

      // optimistic add bot reply with formatted HTML
      addLocalMessage({ id: "bot", name: "Trợ lý ảo" }, botText, formattedHtml);

      // persist bot reply
      const botPayload = {
        conversation_id: converId,
        sender_id: 'bot',
        seq: (seq + 1),
        content: botText,
        create_time: new Date().toISOString()
      };
      await saveMessageToDB(botPayload);

    } catch (err) {
      console.error("Lỗi khi gọi chatbot API:", err);
  const fallback = "⚠️ Có lỗi xảy ra khi kết nối server. Vui lòng thử lại sau!";
  const fbHtml = markdownToHtml(fallback);
  addLocalMessage({ id: "bot", name: "Trợ lý ảo" }, fallback, fbHtml);
      // try to save fallback as bot message
      await saveMessageToDB({
        conversation_id: converId,
        sender_id: 'bot',
        seq: (messages.length || 0) + 2,
        content: fallback,
        create_time: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  }

  if (loading) return <div className={styles.loading}>
                          <div class={styles.lds_ellipsis}><div></div><div></div><div></div><div></div></div>
                      </div>;

  return (
    <div className={styles.chatAppShell} ref={topContainerRef}>
      {/* Main Chat */}
      <main className={styles.chatMain}>
        <header className={styles.chatHeader}>
          <div className={styles.logo}>
            <img src={robot} alt="robot" />
          </div>
        </header>

        <section className={styles.chatContainer}>
          <div className={styles.messages} ref={listRef}>
            {messages.length === 0 ? (
              <div className={styles.empty}>
                <span>
                  Chào mừng đến với&nbsp;<strong>Chatbot Agribank Bắc TP.HCM</strong>, Tôi có thể giúp gì cho bạn?
                </span>
              </div>
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} />)
            )}

            {isTyping && (
              <div className={`${styles.messageRow} ${styles.bot}`}>
                <div className={styles.avatar}></div>
                <div className={`${styles.bubble} ${styles.botBubble} ${styles.typing}`}>
                  <div className={styles.typingDots}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className={styles.divComposer}>
            <form className={styles.composer} onSubmit={handleSend}>
              <textarea
                ref={composerRef}
                inputMode="text"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck={true}
                className={styles.composerInput}
                placeholder="Nhập câu hỏi của bạn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  try {
                    // Small delay for keyboard to appear, then bring composer into view
                    setTimeout(() => {
                      if (composerRef.current && typeof composerRef.current.scrollIntoView === 'function') {
                        composerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
                    }, 120);
                  } catch { /* ignore */ }
                }}
                onTouchStart={() => {
                  try { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; } catch { /* ignore */ }
                }}
                rows={1}
              />
              <button type="submit" className={styles.sendBtn}>
                <SvgIcon path="M14.954.71a.5.5 0 0 1-.1.144L5.4 10.306l2.67 4.451a.5.5 0 0 0 .889-.06zM4.694 9.6L.243 6.928a.5.5 0 0 1 .06-.889L14.293.045a.5.5 0 0 0-.146.101z" />
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

/* MessageBubble hiển thị message object */
function MessageBubble({ message }) {
  const fromBot =
    (message.sender && (String(message.sender.id).toLowerCase() === "bot" || message.sender.id === "bot")) ||
    (message.role && message.role === "bot") ||
    message.sender === "bot";

  // const senderName = message.sender?.name ?? message.sender_name ?? (fromBot ? "Trợ lý ảo" : "Bạn");

  const text = message.text ?? message.content ?? message.body ?? "";
  // If backend provided already-formatted HTML use it, otherwise run
  // our small markdown converter so **bold** is rendered as <strong>
  const contentHtml = message.html ?? (text ? markdownToHtml(text) : '');

  // const timeStamp = message.create_time ?? Date.now();
  // const date = new Date(timeStamp);
  // const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`${styles.messageRow} ${fromBot ? styles.bot : styles.user}`}>
      {!fromBot && <div className={styles.spacer} />}
      <div className={styles.bubbleWrap}>
        <div className={`${styles.bubble} ${fromBot ? styles.botBubble : styles.userBubble}`}>
          <div className={styles.bubbleText} dangerouslySetInnerHTML={{ __html: contentHtml }} />
        </div>
        {/* <div className={styles.bubbleMeta}>
          <span className={styles.sender}>{senderName}</span>
          <span className={styles.time}>{timeStr}</span>
        </div> */}
      </div>
      {fromBot && <div className={styles.spacer} />}
    </div>
  );
}
