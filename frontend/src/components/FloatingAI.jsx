import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sparkles, X, Send, Volume2, VolumeX,
  Bot, User, Maximize2, Mic, MicOff, Pencil, Check, Copy,
} from "lucide-react";
import api from "../api/axios";

/* ══════════════════════════════
   TTS helper
══════════════════════════════ */
const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
const speakText = (text) => {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; u.rate = 0.95; u.pitch = 1;
  synth.speak(u);
};

/* ══════════════════════════════
   Sous-composants
══════════════════════════════ */
function Bubble({ msg, onEdit }) {
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

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
        isUser ? "bg-indigo-600" : "bg-gradient-to-br from-sky-500 to-indigo-600"
      }`}>
        {isUser ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-white" />}
      </div>
      <div className="max-w-[80%]">
        {editing ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
                if (e.key === "Escape") handleCancelEdit();
              }}
              rows={2}
              className="w-full px-2 py-1.5 text-xs rounded-lg border border-indigo-300 bg-indigo-50 text-slate-800 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <div className="flex gap-1 justify-end">
              <button onClick={handleCancelEdit} className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="w-3 h-3" />
              </button>
              <button onClick={handleConfirmEdit} className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                <Check className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"
          }`}>
            {msg.content}
          </div>
        )}

        {/* Actions sous la bulle */}
        {!editing && (
          <div className={`flex items-center gap-1.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "justify-end" : "justify-start"}`}>
            <button
              onClick={handleCopy}
              className={`p-0.5 ${copied ? "text-emerald-500" : "text-slate-400 hover:text-sky-500"}`}
              title="Copier"
            >
              {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
            {isUser && onEdit && (
              <button
                onClick={() => setEditing(true)}
                className="p-0.5 text-slate-400 hover:text-indigo-500"
                title="Modifier"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            )}
            {!isUser && (
              <button
                onClick={() => speakText(msg.content)}
                className="p-0.5 text-slate-400 hover:text-sky-500"
                title="Lire"
              >
                <Volume2 className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3 h-3 text-white" />
      </div>
      <div className="bg-white border border-slate-200 px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
        <div className="flex gap-1 items-center">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

const WELCOME = {
  role: "assistant",
  content: "Bonjour ! Je suis Lia, votre assistante LibraFlow 📚 Je peux vous aider à trouver un livre, obtenir des recommandations ou répondre à vos questions. Comment puis-je vous aider ?",
};

/* Dimensions du panel */
const PANEL_W = 360;
const PANEL_H = 500;

/* Détection support dictée vocale (toujours vrai grâce à notre Whisper universel) */
const STT_SUPPORTED = true;

/* ══════════════════════════════
   Composant principal
══════════════════════════════ */
export default function FloatingAI() {
  const location = useLocation();

  /* ── État chat ── */
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([WELCOME]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [tts,       setTts]       = useState(false);
  const [listening, setListening] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);

  /* ── Drag & Drop ── */
  const [pos,         setPos]         = useState(null);   // { x, y } du bouton
  const [initialized, setInitialized] = useState(false);
  const isDragging  = useRef(false);
  const didMove     = useRef(false);
  const dragOffset  = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  /* ── Autres refs ── */
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* Page IA dédiée → pas de widget flottant (doublon inutile) */
  const onAIPage = location.pathname === "/app/ai";

  /* ── Position initiale : bas-droite ── */
  useEffect(() => {
    const x = window.innerWidth  - PANEL_W - 24;
    const y = window.innerHeight - 80;
    setPos({ x, y });
    setInitialized(true);
  }, []);

  const loadLatestConversation = async () => {
    try {
      const { data: convs } = await api.get("/conversations");
      if (convs && convs.length > 0) {
        const latest = convs[0];
        setActiveConvId(latest._id);
        const { data: fullConv } = await api.get(`/conversations/${latest._id}`);
        if (fullConv.messages && fullConv.messages.length > 0) {
          const formatted = fullConv.messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages(formatted);
        } else {
          setMessages([WELCOME]);
        }
      } else {
        setMessages([WELCOME]);
        setActiveConvId(null);
      }
    } catch (err) {
      setMessages([WELCOME]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLatestConversation();
    }
  }, [isOpen]);

  /* ── Listeners globaux mousemove / mouseup / touch ── */
  useEffect(() => {
    const move = (cx, cy) => {
      if (!isDragging.current) return;
      didMove.current = true;

      const el = containerRef.current;
      const elH = el?.offsetHeight || 60;

      // Clamp pour garder le bouton dans la fenêtre
      const newX = Math.max(8, Math.min(cx - dragOffset.current.x, window.innerWidth  - 80));
      const newY = Math.max(8, Math.min(cy - dragOffset.current.y, window.innerHeight - elH - 8));
      setPos({ x: newX, y: newY });
    };

    const up = () => { isDragging.current = false; };
    const onMouseMove = (e) => move(e.clientX, e.clientY);
    const onTouchMove = (e) => {
      if (!isDragging.current) return;
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    };

    document.addEventListener("mousemove",  onMouseMove);
    document.addEventListener("mouseup",    up);
    document.addEventListener("touchmove",  onTouchMove, { passive: false });
    document.addEventListener("touchend",   up);

    return () => {
      document.removeEventListener("mousemove",  onMouseMove);
      document.removeEventListener("mouseup",    up);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   up);
    };
  }, []);

  /* ── Scroll bas ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ── Focus input à l'ouverture ── */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 120);
  }, [isOpen]);

  /* ── Echap ── */
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* ── Démarrer un drag ── */
  const startDrag = (cx, cy) => {
    isDragging.current = true;
    didMove.current    = false;
    const rect = containerRef.current?.getBoundingClientRect();
    dragOffset.current = rect ? { x: cx - rect.left, y: cy - rect.top } : { x: 0, y: 0 };
  };

  const onMouseDown  = (e) => { if (e.button === 0) { startDrag(e.clientX, e.clientY); e.preventDefault(); } };
  const onTouchStart = (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY);

  /* Click vs drag : toggle seulement si pas de mouvement */
  const handleToggle = () => { if (!didMove.current) setIsOpen((o) => !o); };

  /* ── Envoi message ── */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    
    let convId = activeConvId;
    const ts = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: text, timestamp: ts };
    
    if (!convId) {
      try {
        const { data } = await api.post("/conversations", { title: text.slice(0, 60) });
        convId = data._id;
        setActiveConvId(data._id);
      } catch (err) {
        // Fallback
      }
    }

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", {
        message: text,
        history: messages.map((m) => ({ role: m.role, text: m.content })),
      });
      const reply = res.data.reply || res.data.message || "Je n'ai pas pu répondre.";
      const aiMsg = { role: "assistant", content: reply, timestamp: ts };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      if (tts) speakText(reply);

      if (convId) {
        await api.put(`/conversations/${convId}`, {
          messages: finalMessages,
        });
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Désolée, une erreur s'est produite. Réessayez !" }]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Envoi message édité ── */
  const handleSendWithText = async (text, historyBefore) => {
    if (!text || loading) return;
    
    let convId = activeConvId;
    const ts = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const userMsg = { role: "user", content: text, timestamp: ts };
    
    if (!convId) {
      try {
        const { data } = await api.post("/conversations", { title: text.slice(0, 60) });
        convId = data._id;
        setActiveConvId(data._id);
      } catch (err) {
        // Fallback
      }
    }

    const newMessages = [...historyBefore, userMsg];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await api.post("/ai/chat", {
        message: text,
        history: historyBefore.map((m) => ({ role: m.role, text: m.content })),
      });
      const reply = res.data.reply || res.data.message || "Je n'ai pas pu répondre.";
      const aiMsg = { role: "assistant", content: reply, timestamp: ts };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      if (tts) speakText(reply);

      if (convId) {
        await api.put(`/conversations/${convId}`, {
          messages: finalMessages,
        });
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Désolée, une erreur s'est produite. Réessayez !" }]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Dictée vocale via Whisper (Cross-browser, compatible Firefox) ── */
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
          setLoading(true);
          try {
            const { data } = await api.post("/ai/transcribe", { audio: base64Audio });
            if (data.text) {
              setInput((p) => p + data.text + " ");
            }
          } catch (err) {
            // Fallback
          } finally {
            setLoading(false);
          }
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      // Erreur micro
    }
  };

  /* ── Calcul position et hauteur du panel ── */
  const buttonHeight = 56; // h-14 = 56px
  const spaceAbove = pos ? pos.y - 16 : window.innerHeight;
  const spaceBelow = pos ? window.innerHeight - pos.y - buttonHeight - 16 : window.innerHeight;
  
  // S'ouvre du côté où il y a le plus d'espace
  const showAbove = spaceAbove > spaceBelow;
  
  // Limite la hauteur à l'espace disponible (sans dépasser PANEL_H)
  const availableSpace = showAbove ? spaceAbove : spaceBelow;
  const actualHeight = Math.min(PANEL_H, Math.max(availableSpace, 200)); // Minimum 200px

  // Décalage horizontal du panel pour rester dans la fenêtre
  const panelLeftOffset = pos
    ? Math.min(0, window.innerWidth - pos.x - PANEL_W - 8)
    : 0;

  if (!initialized || onAIPage) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: pos?.x ?? 0,
        top:  pos?.y ?? 0,
        zIndex: 60,
        userSelect: "none",
      }}
    >
      {/* ════════════════════════════
          Panel de chat (flottant)
      ════════════════════════════ */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            left:   panelLeftOffset,
            width:  PANEL_W,
            height: actualHeight,
            ...(showAbove
              ? { bottom: "calc(100% + 12px)" }
              : { top:    "calc(100% + 12px)" }),
          }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-slide-up"
        >
          {/* ── Header — zone de drag ── */}
          <div
            className="bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-3 flex items-center gap-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            title="Glisser pour déplacer"
          >
            {/* Avatar Lia */}
            <div className="relative flex-shrink-0 pointer-events-none">
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
            </div>

            {/* Nom + statut */}
            <div className="flex-1 min-w-0 pointer-events-none">
              <p className="text-white font-bold text-sm leading-none">Lia</p>
              <p className="text-sky-200 text-[10px] mt-0.5 uppercase tracking-widest font-medium">● En ligne</p>
            </div>

            {/* Contrôles — stopPropagation pour ne pas déclencher le drag */}
            <div
              className="flex items-center gap-1"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setTts(!tts); if (tts) synth?.cancel(); }}
                title={tts ? "Désactiver la lecture" : "Activer la lecture vocale"}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                {tts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <Link
                to="/app/ai"
                onClick={() => setIsOpen(false)}
                title="Mode avancé (historique, résumés…)"
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Zone de messages ── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <Bubble
                key={i}
                msg={msg}
                onEdit={msg.role === "user" ? (newText) => handleSendWithText(newText, messages.slice(0, i)) : null}
              />
            ))}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="p-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex gap-2 items-center">
              {/* Champ texte */}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Posez votre question…"
                className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 focus:bg-white transition-all"
              />

              {/* 🎤 Micro — juste à côté du bouton Envoyer */}
              <button
                onClick={toggleListening}
                title={
                  !STT_SUPPORTED
                    ? "Dictée non disponible sur Firefox (utilisez Chrome/Edge)"
                    : listening
                    ? "Arrêter la dictée"
                    : "Dictée vocale"
                }
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  !STT_SUPPORTED
                    ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                    : listening
                    ? "bg-red-500 text-white shadow-md animate-pulse"
                    : "bg-slate-100 text-slate-500 hover:bg-sky-100 hover:text-sky-600"
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* ➤ Envoyer */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-xl hover:shadow-md transition-all disabled:opacity-40 flex-shrink-0 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[9px] text-slate-400 text-center mt-2 uppercase tracking-widest">
              Propulsé par l'Intelligence LibraFlow AI
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════
          Bouton flottant (trigger)
          — aussi zone de drag —
      ════════════════════════════ */}
      <button
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleToggle}
        className={`group relative flex items-center shadow-2xl transition-all duration-300 ease-out cursor-grab active:cursor-grabbing select-none ${
          isOpen
            ? "w-14 h-14 justify-center rounded-full bg-slate-800 text-white"
            : "h-14 px-3 rounded-full hover:rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:scale-105 hover:shadow-sky-500/50 hover:shadow-xl animate-bounce"
        }`}
        style={!isOpen ? { animationDuration: '3s' } : {}}
        aria-label={isOpen ? "Fermer l'assistant Lia" : "Ouvrir l'assistant Lia"}
      >
        {/* Halo d'énergie animé (plus visible et plus large) */}
        {!isOpen && (
          <div className="absolute inset-[-4px] rounded-full bg-sky-400 animate-ping opacity-60 group-hover:opacity-0 pointer-events-none" style={{ animationDuration: '1.5s' }} />
        )}

        <div className={`relative z-10 flex items-center justify-center flex-shrink-0 pointer-events-none transition-all duration-300 ${
          isOpen ? "w-8 h-8 rounded-full bg-white/20" : "w-8 h-8 rounded-full group-hover:rounded-xl bg-white/20"
        }`}>
          {isOpen ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </div>
        {!isOpen && (
          <div className="relative z-10 text-left pointer-events-none max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-3 transition-all duration-300 whitespace-nowrap overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 leading-none">Besoin d'aide ?</p>
            <p className="text-sm font-bold leading-tight mt-0.5">Demander à Lia</p>
          </div>
        )}
      </button>
    </div>
  );
}
