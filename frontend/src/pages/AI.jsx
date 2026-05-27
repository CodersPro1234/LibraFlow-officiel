import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import {
  MessageSquare, BookOpen, Star, BarChart2, Plus, Trash2,
  Send, Volume2, VolumeX, Mic, MicOff, RefreshCw, ChevronLeft,
  Users, Sparkles, BookMarked, Bot, User, Pencil, Check, X, Copy,
} from "lucide-react";

/* ══════════════════════════════════
   TTS / STT helpers (Web Speech API)
══════════════════════════════════ */
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

const speak = (text, lang = "fr-FR") => {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang  = lang;
  u.rate  = 0.95;
  u.pitch = 1;
  synth.speak(u);
};

const stopSpeaking = () => synth?.cancel();

/* ──────────────────────────────────
   Sous-composants
────────────────────────────────── */
/* Formate une date : "Aujourd'hui", "Hier", ou "12 mai" */
function fmtConvDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff  = Math.round((today - dDay) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function ConvItem({ conv, isActive, onSelect, onDelete }) {
  return (
    <div
      onClick={() => onSelect(conv)}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive
          ? "bg-sky-50 border border-sky-200 text-sky-700"
          : "hover:bg-slate-50 text-slate-700"
      }`}
    >
      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{conv.title || "Nouvelle conversation"}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {fmtConvDate(conv.updatedAt || conv.createdAt)}
          {conv.messages?.length > 0 && (
            <span className="ml-1 opacity-60">· {conv.messages.length} msg</span>
          )}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(conv._id); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all"
        title="Supprimer"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ──────────────────────────────────
   Formateur de texte IA (markdown-lite)
────────────────────────────────── */
function renderInline(text, baseKey = 0) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chunk = match[0];
    if (chunk.startsWith("**")) {
      parts.push(<strong key={`${baseKey}-b-${match.index}`} className="font-semibold">{chunk.slice(2, -2)}</strong>);
    } else if (chunk.startsWith("`")) {
      parts.push(<code key={`${baseKey}-c-${match.index}`} className="bg-slate-100 text-sky-700 px-1 py-0.5 rounded text-xs font-mono">{chunk.slice(1, -1)}</code>);
    }
    lastIndex = match.index + chunk.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 0 ? text : parts;
}

function FormattedContent({ content }) {
  if (!content) return null;
  const lines = content.split("\n");
  const result = [];
  let listItems = [];
  let listType = null; // "ul" | "ol"

  const flushList = (key) => {
    if (!listItems.length) return;
    if (listType === "ol") {
      result.push(
        <ol key={`ol-${key}`} className="list-decimal list-inside space-y-0.5 my-1.5 ml-1 text-sm leading-relaxed">
          {listItems}
        </ol>
      );
    } else {
      result.push(
        <ul key={`ul-${key}`} className="space-y-0.5 my-1.5 ml-1">
          {listItems}
        </ul>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(i);
      return;
    }

    // Separator ═══ / --- / ===
    if (/^[═─=\-]{3,}$/.test(trimmed)) {
      flushList(i);
      result.push(<hr key={i} className="border-slate-200 my-2" />);
      return;
    }

    // Markdown header ### or ##
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      flushList(i);
      result.push(
        <p key={i} className="font-bold text-slate-900 text-sm mt-2 mb-0.5">{renderInline(headerMatch[1], i)}</p>
      );
      return;
    }

    // Numbered list  1. 2.
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      if (listType !== "ol") { flushList(i); listType = "ol"; }
      listItems.push(
        <li key={i} className="text-sm leading-relaxed">{renderInline(olMatch[2], i)}</li>
      );
      return;
    }

    // Bullet list  * - •
    const ulMatch = trimmed.match(/^[*\-•]\s+(.+)$/);
    if (ulMatch) {
      if (listType !== "ul") { flushList(i); listType = "ul"; }
      listItems.push(
        <li key={i} className="flex gap-1.5 items-start text-sm leading-relaxed">
          <span className="text-sky-400 mt-0.5 flex-shrink-0 select-none">•</span>
          <span>{renderInline(ulMatch[1], i)}</span>
        </li>
      );
      return;
    }

    flushList(i);
    result.push(
      <p key={i} className="text-sm leading-relaxed">{renderInline(trimmed, i)}</p>
    );
  });

  flushList("end");
  return <div className="space-y-1">{result}</div>;
}

function ChatBubble({ msg, onSpeak, onEdit }) {
  const isUser = msg.role === "user";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [copied, setCopied] = useState(false);
  const editRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmEdit = () => {
    if (editText.trim() && editText.trim() !== msg.content) {
      onEdit?.(editText.trim());
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(msg.content);
    setEditing(false);
  };

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-indigo-600" : "bg-gradient-to-br from-sky-500 to-indigo-600"}`}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className={isUser ? "max-w-[70%]" : "max-w-[82%]"}>
        {/* Bulle message */}
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
                if (e.key === "Escape") handleCancelEdit();
              }}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-xl border border-indigo-300 bg-indigo-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={handleCancelEdit}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                title="Annuler"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleConfirmEdit}
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                title="Confirmer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm text-sm leading-relaxed"
              : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
          }`}>
            {isUser ? msg.content : <FormattedContent content={msg.content} />}
          </div>
        )}

        {/* Actions sous la bulle */}
        {!editing && (
          <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
            <span className="text-[10px] text-slate-400">{msg.timestamp || ""}</span>

            {/* 📋 Bouton Copier — pour tous les messages */}
            <button
              onClick={handleCopy}
              className={`p-0.5 transition-colors ${copied ? "text-emerald-500" : "text-slate-400 hover:text-sky-500"}`}
              title={copied ? "Copié !" : "Copier le message"}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </button>

            {/* 🔊 Haut-parleur — toujours visible sur les bulles IA */}
            {!isUser && onSpeak && (
              <button
                onClick={() => onSpeak(msg.content)}
                className="p-0.5 text-slate-400 hover:text-sky-500 transition-colors"
                title="Lire à voix haute"
              >
                <Volume2 className="w-3 h-3" />
              </button>
            )}

            {/* ✏️ Crayon — toujours visible sur les bulles utilisateur */}
            {isUser && onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-0.5 text-slate-400 hover:text-indigo-500 transition-colors"
                title="Modifier ce message"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════
   Page principale
══════════════════════════════════ */
export default function AI() {
  const { user }    = useAuth();
  const { t }       = useLanguage();
  const toast       = useToast();
  const isLibrarian = user?.role === "librarian";

  const TABS = [
    { key: "chat",    label: "Chat",             Icon: MessageSquare                           },
    { key: "summary", label: t("summary") || "Résumé", Icon: BookMarked                       },
    { key: "reco",    label: "Recommandations",  Icon: Star                                    },
    { key: "stats",   label: "Stats",            Icon: BarChart2, libOnly: true                },
    { key: "admin",   label: "Historique",       Icon: Users,     libOnly: true                },
  ].filter((tab) => !tab.libOnly || isLibrarian);

  const [activeTab,   setActiveTab]   = useState("chat");
  // Sur mobile (< 768px) la sidebar est cachée par défaut
  const [sidebarOpen, setSidebar]     = useState(() => window.innerWidth >= 768);

  /* Conversations */
  const [convList,    setConvList]    = useState([]);
  const [activeConv,  setActiveConv]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [convLoading, setConvLoading] = useState(false);

  /* Chat */
  const [input,   setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);

  /* TTS / STT */
  const [speaking,  setSpeaking]  = useState(false);
  const [listening, setListening] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* Résumé */
  const [booksList,  setBooksList]  = useState([]);
  const [bookSearch, setBookSearch] = useState("");
  const [summary,    setSummary]    = useState("");
  const [sumLoading, setSumLoading] = useState(false);

  /* Recommandations */
  const [recos,    setRecos]    = useState([]);
  const [recoLoad, setRecoLoad] = useState(false);

  /* Stats */
  const [statSum,  setStatSum]  = useState("");
  const [statLoad, setStatLoad] = useState(false);

  /* Admin */
  const [adminConvs, setAdminConvs] = useState([]);
  const [adminLoad,  setAdminLoad]  = useState(false);
  const [adminSel,   setAdminSel]   = useState(null);
  const [adminSelMsgs, setAdminSelMsgs] = useState([]);
  const [adminSelLoading, setAdminSelLoading] = useState(false);

  /* ── Chargement initial ── */
  const selectConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    setConvLoading(true);
    try {
      const { data } = await api.get(`/conversations/${conv._id}`);
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/conversations");
        setConvList(data);
        if (data.length > 0) await selectConversation(data[0]);
      } catch { /* silencieux */ }
    })();
    api.get("/books?limit=100").then((res) => {
      setBooksList(Array.isArray(res.data) ? res.data : res.data.books || []);
    }).catch(() => {});
  }, [selectConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeTab === "admin") loadAdminConvs();
    if (activeTab === "stats" && !statSum) handleStats();
  }, [activeTab]);

  /* ── Conversations ── */
  const createConversation = async () => {
    try {
      const { data } = await api.post("/conversations", { title: "Nouvelle conversation" });
      setConvList((prev) => [data, ...prev]);
      setActiveConv(data);
      setMessages([]);
    } catch { toast.error("Impossible de créer la conversation"); }
  };

  const deleteConversation = async (id) => {
    if (!window.confirm("Supprimer cette conversation ?")) return;
    try {
      await api.delete(`/conversations/${id}`);
      setConvList((prev) => prev.filter((c) => c._id !== id));
      if (activeConv?._id === id) { setActiveConv(null); setMessages([]); }
    } catch { toast.error("Impossible de supprimer"); }
  };

  const persistMessages = async (convId, newMessages, newTitle) => {
    try {
      await api.put(`/conversations/${convId}`, {
        messages: newMessages,
        ...(newTitle ? { title: newTitle } : {}),
      });
    } catch { /* données en mémoire */ }
  };

  /* ── Envoi chat ── */
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    let conv = activeConv;
    if (!conv) {
      try {
        const { data } = await api.post("/conversations", { title: input.slice(0, 60) });
        conv = data;
        setConvList((prev) => [data, ...prev]);
        setActiveConv(data);
      } catch { toast.error("Erreur lors de la création"); return; }
    }

    const ts      = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: input.trim(), timestamp: ts };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setSending(true);

    try {
      const { data } = await api.post("/ai/chat", {
        message: input.trim(),
        history: messages.slice(-20).map((m) => ({ role: m.role, text: m.content })),
      });
      const aiMsg = {
        role:      "assistant",
        content:   data.reply || "...",
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      const isFirst = newMsgs.length === 1;
      await persistMessages(conv._id, finalMsgs, isFirst ? input.slice(0, 60) : null);
      setConvList((prev) => prev.map((c) =>
        c._id === conv._id
          ? { ...c, title: isFirst ? input.slice(0, 60) : c.title, lastMessage: data.reply?.slice(0, 80) }
          : c
      ));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur IA");
    } finally {
      setSending(false);
    }
  };

  /* ── Envoi après édition d'un message utilisateur ── */
  const handleSendWithText = async (text, historyBefore) => {
    if (!text || sending) return;
    const conv = activeConv;
    const ts = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: text, timestamp: ts };
    const newMsgs = [...historyBefore, userMsg];
    setMessages(newMsgs);
    setSending(true);
    try {
      const { data } = await api.post("/ai/chat", {
        message: text,
        history: historyBefore.slice(-20).map((m) => ({ role: m.role, text: m.content })),
      });
      const aiMsg = {
        role: "assistant",
        content: data.reply || "...",
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      const finalMsgs = [...newMsgs, aiMsg];
      setMessages(finalMsgs);
      if (conv) await persistMessages(conv._id, finalMsgs, null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur IA");
    } finally {
      setSending(false);
    }
  };

  /* ── TTS ── */
  const handleSpeak = (text) => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    speak(text);
    setSpeaking(true);
    const check = setInterval(() => {
      if (!synth?.speaking) { setSpeaking(false); clearInterval(check); }
    }, 300);
  };

  /* ── STT ── */
  const toggleListening = async () => {
    if (listening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          setSending(true);
          try {
            const { data } = await api.post("/ai/transcribe", { audio: base64Audio });
            if (data.text) {
              setInput((p) => p + data.text + " ");
            }
          } catch (err) {
            toast.error("Erreur de transcription audio");
          } finally {
            setSending(false);
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      toast.error("Impossible d'accéder au microphone");
    }
  };

  /* ── Résumé ── */
  const handleSummarize = async () => {
    if (!bookSearch.trim()) { toast.error("Saisissez un titre de livre"); return; }
    setSumLoading(true); setSummary("");
    try {
      const found   = booksList.find((b) => b.title.toLowerCase() === bookSearch.toLowerCase());
      const payload = found ? { bookId: found._id } : { title: bookSearch };
      const { data } = await api.post("/ai/summarize", payload);
      setSummary(data.summary || "");
    } catch (err) {
      toast.error(err.response?.data?.message || "Livre introuvable");
    } finally { setSumLoading(false); }
  };

  /* ── Recommandations ── */
  const handleReco = async () => {
    setRecoLoad(true); setRecos([]);
    try {
      const { data } = await api.post("/ai/recommend");
      setRecos(Array.isArray(data.recommendations) ? data.recommendations : []);
    } catch (err) { toast.error(err.response?.data?.message || "Erreur IA"); }
    finally { setRecoLoad(false); }
  };

  /* ── Stats ── */
  const handleStats = async () => {
    setStatLoad(true); setStatSum("");
    try {
      const { data } = await api.get("/ai/stats-summary");
      setStatSum(data.summary || "");
    } catch (err) { toast.error(err.response?.data?.message || "Erreur IA"); }
    finally { setStatLoad(false); }
  };

  /* ── Admin historique ── */
  const loadAdminConvs = async () => {
    setAdminLoad(true);
    try {
      const { data } = await api.get("/conversations/admin");
      setAdminConvs(data);
    } catch { toast.error("Erreur chargement"); }
    finally { setAdminLoad(false); }
  };

  const handleSelectAdminConv = async (conv) => {
    if (adminSel?._id === conv._id) {
      setAdminSel(null);
      setAdminSelMsgs([]);
      return;
    }
    setAdminSel(conv);
    setAdminSelLoading(true);
    setAdminSelMsgs([]);
    try {
      const { data } = await api.get(`/conversations/${conv._id}`);
      setAdminSelMsgs(data.messages || []);
    } catch {
      toast.error("Impossible de charger le détail des messages");
      setAdminSel(null);
    } finally {
      setAdminSelLoading(false);
    }
  };

  /* ══════════════════════════════════
     RENDU
  ══════════════════════════════════ */
  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-4rem)] md:h-screen -mx-4 -my-4 sm:-mx-6 sm:-my-6 md:-mx-8 md:-my-8">

      {/* ── Onglets ── */}
      <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-1.5 mr-4 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm hidden sm:block">Lia — Assistant LibraFlow</span>
        </div>

        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-sky-50 text-sky-700 border border-sky-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Corps ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Backdrop sidebar mobile ── */}
        {activeTab === "chat" && sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-10 md:hidden"
            onClick={() => setSidebar(false)}
          />
        )}

        {/* SIDEBAR conversations */}
        {activeTab === "chat" && (
          <aside className={`
            ${sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"}
            flex-shrink-0 bg-white border-r border-slate-200 overflow-hidden transition-all duration-300 flex flex-col
            md:relative
            fixed top-0 left-0 h-full z-20 md:z-auto
          `}>
            <div className="p-3 border-b border-slate-100 flex-shrink-0">
              <button
                onClick={createConversation}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {convList.length === 0
                ? <p className="text-center text-slate-400 text-xs py-6">Aucune conversation</p>
                : convList.map((conv) => (
                    <ConvItem
                      key={conv._id}
                      conv={conv}
                      isActive={activeConv?._id === conv._id}
                      onSelect={selectConversation}
                      onDelete={deleteConversation}
                    />
                  ))}
            </div>
          </aside>
        )}

        {/* ZONE CHAT */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            {/* Header chat */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
              <button onClick={() => setSidebar(!sidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-slate-500" /> : <MessageSquare className="w-4 h-4 text-slate-500" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{activeConv?.title || "Nouvelle conversation"}</p>
                <p className="text-[10px] text-slate-400">{messages.length} message{messages.length !== 1 ? "s" : ""}</p>
              </div>
            </div>


            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {convLoading ? (
                <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-slate-700 font-bold mb-2">Bonjour ! Je suis Lia 👋</h3>
                  <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                    Posez-moi vos questions sur les livres, demandez un résumé, des recommandations, ou explorez le catalogue.
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <ChatBubble
                    key={i}
                    msg={msg}
                    onSpeak={msg.role === "assistant" ? handleSpeak : null}
                    onEdit={msg.role === "user" ? (newText) => {
                      // Coupe l'historique avant ce message et relance avec le texte modifié
                      handleSendWithText(newText, messages.slice(0, i));
                    } : null}
                  />
                ))
              )}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center shadow-sm">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-4 bg-white border-t border-slate-200">
              {listening && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <Mic className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                  <span className="text-xs text-red-600 font-medium">Dictée vocale en cours…</span>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Écrivez votre message… (Entrée pour envoyer)"
                  rows={1}
                  className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all max-h-32"
                />
                {/* 🎤 Micro — à côté du bouton Envoyer */}
                <button
                  onClick={toggleListening}
                  title={listening ? "Arrêter la dictée" : "Dictée vocale"}
                  className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                    listening
                      ? "bg-red-500 text-white shadow-md animate-pulse"
                      : "bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600"
                  }`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="p-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RÉSUMÉ */}
        {activeTab === "summary" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-sky-500" />
                Résumé de livre
              </h2>
              <p className="text-slate-400 text-sm mb-6">Entrez un titre — pas besoin de l'ID !</p>

              <div className="flex gap-2 mb-6">
                <div className="flex-1 relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    list="books-list"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
                    placeholder="Titre du livre (ex: Clean Code)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                  <datalist id="books-list">
                    {booksList.map((b) => <option key={b._id} value={b.title} />)}
                  </datalist>
                </div>
                <button
                  onClick={handleSummarize}
                  disabled={sumLoading || !bookSearch.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {sumLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Résumer
                </button>
              </div>

              {summary && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-sky-600 uppercase tracking-widest">Résumé IA</p>
                    <button onClick={() => speak(summary)} className="p-1.5 hover:bg-sky-50 rounded-lg transition-colors" title="Lire">
                      <Volume2 className="w-4 h-4 text-sky-500" />
                    </button>
                  </div>
                  <div className="text-slate-700"><FormattedContent content={summary} /></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RECOMMANDATIONS */}
        {activeTab === "reco" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                Recommandations personnalisées
              </h2>
              <p className="text-slate-400 text-sm mb-6">Basées sur votre historique d'emprunts</p>

              <button
                onClick={handleReco}
                disabled={recoLoad}
                className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2 mb-6"
              >
                {recoLoad ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Générer mes recommandations
              </button>

              {recos.length > 0 && (
                <div className="space-y-4 animate-fade-in">
                  {recos.map((r, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center font-black text-indigo-600 flex-shrink-0">{i + 1}</div>
                      <div>
                        <p className="font-bold text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-400 mb-2">{r.author}</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATS (librarian) */}
        {activeTab === "stats" && isLibrarian && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                Analyse IA — Bibliothèque
              </h2>
              <p className="text-slate-400 text-sm mb-6">Commentaire intelligent sur les statistiques actuelles</p>

              <button
                onClick={handleStats}
                disabled={statLoad}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm hover:shadow-md transition-all disabled:opacity-40 flex items-center justify-center gap-2 mb-6"
              >
                {statLoad ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
                Analyser la bibliothèque
              </button>

              {statSum && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Analyse IA</p>
                    <button onClick={() => speak(statSum)} className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Volume2 className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                  <div className="text-slate-700"><FormattedContent content={statSum} /></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HISTORIQUE ADMIN */}
        {activeTab === "admin" && isLibrarian && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-500" />
                Historique global des conversations
              </h2>
              <p className="text-slate-400 text-sm mb-6">{adminConvs.length} conversation{adminConvs.length !== 1 ? "s" : ""} au total</p>

              {adminLoad ? (
                <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : adminConvs.length === 0 ? (
                <p className="text-center text-slate-400 py-12">Aucune conversation enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {adminConvs.map((conv) => (
                    <div
                      key={conv._id}
                      onClick={() => handleSelectAdminConv(conv)}
                      className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 cursor-pointer hover:shadow-hover transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm flex-shrink-0">
                          {conv.user?.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{conv.user?.name || "Inconnu"}</p>
                          <p className="text-xs text-slate-400 truncate">{conv.title}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-slate-600">{conv.msgCount} msg</p>
                          <p className="text-[10px] text-slate-400">{new Date(conv.updatedAt).toLocaleDateString("fr-FR")}</p>
                        </div>
                      </div>

                      {adminSel?._id === conv._id && (
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                          {adminSelLoading ? (
                            <div className="flex justify-center py-4">
                              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                            </div>
                          ) : adminSelMsgs.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-2">Aucun message dans cette conversation</p>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                              {adminSelMsgs.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                  <div
                                    key={index}
                                    className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                                  >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                                      isUser ? "bg-indigo-600 text-white" : "bg-sky-500 text-white"
                                    }`}>
                                      {isUser ? (conv.user?.name?.charAt(0).toUpperCase() || "U") : "L"}
                                    </div>
                                    <div className={`rounded-2xl px-3 py-2 ${
                                      isUser
                                        ? "max-w-[70%] bg-indigo-600 text-white rounded-tr-sm text-xs leading-relaxed"
                                        : "max-w-[80%] bg-slate-100 text-slate-800 rounded-tl-sm"
                                    }`}>
                                      {isUser
                                        ? <p className="whitespace-pre-wrap">{msg.content}</p>
                                        : <div className="text-slate-700"><FormattedContent content={msg.content} /></div>
                                      }
                                      {msg.timestamp && (
                                        <p className={`text-[8px] mt-1 text-right ${isUser ? "text-indigo-200" : "text-slate-400"}`}>
                                          {msg.timestamp}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
