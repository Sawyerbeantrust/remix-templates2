import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Phone, Sparkles, User, RefreshCw, ExternalLink, ShieldCheck, Wrench, ZoomIn, ZoomOut, Eye } from 'lucide-react';
import { handleImageElementError } from '../utils/imageFallback';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AssistantChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
  onSelectProduct?: (productId: string) => void;
  language?: 'en' | 'af';
}

function renderFormattedMessage(text: string, onSelectProduct?: (productId: string) => void, zoomLevel: number = 1.0) {
  if (!text) return null;

  // Split lines to detect markdown images and links
  const lines = text.split('\n');

  return (
    <div className="space-y-2 font-sans" style={{ fontSize: `${zoomLevel * 12}px` }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        // Check if line is a markdown image line e.g. ![thumbnail](url)
        const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          const alt = imgMatch[1];
          const src = imgMatch[2];
          return (
            <div key={lineIdx} className="my-1.5 overflow-hidden rounded-lg border border-neutral-700 bg-black/40 p-1 inline-block max-w-[220px]">
              <img
                src={src}
                alt={alt || 'Product thumbnail'}
                className="w-full h-28 object-cover rounded-md"
                referrerPolicy="no-referrer"
                onError={(e) => handleImageElementError(e)}
              />
            </div>
          );
        }

        // Check if line contains markdown link e.g. [View product](url)
        const linkMatch = trimmed.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch && trimmed.startsWith('[')) {
          const label = linkMatch[1];
          const url = linkMatch[2];
          let productId = '';
          if (url.includes('product=')) {
            productId = url.split('product=')[1];
          }

          return (
            <div key={lineIdx} className="mt-1">
              <button
                onClick={() => {
                  if (productId && onSelectProduct) {
                    onSelectProduct(productId);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-sm uppercase tracking-wider"
                style={{ fontSize: `${Math.max(10, zoomLevel * 11)}px` }}
              >
                <span>{label}</span>
                <ExternalLink size={13} />
              </button>
            </div>
          );
        }

        // Parse bold text **[Product Name]** or **Text**
        let formattedLine: React.ReactNode = trimmed;
        if (trimmed.includes('**')) {
          const parts = trimmed.split(/(\*\*.*?\*\*)/g);
          formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const content = part.slice(2, -2);
              return <strong key={pIdx} className="font-bold text-white" style={{ fontSize: `${zoomLevel * 13}px` }}>{content}</strong>;
            }
            return part;
          });
        }

        if (!trimmed) {
          return <div key={lineIdx} className="h-1" />;
        }

        return (
          <p key={lineIdx} className="leading-relaxed text-neutral-200">
            {formattedLine}
          </p>
        );
      })}
    </div>
  );
}

const DEFAULT_SUGGESTIONS = [
  "Are you an AI?",
  "Which 2-post lift is best for 4.0 Ton vehicles?",
  "What is your warranty coverage & operating hours?",
  "I need a quote for custom installation & site visit"
];

export default function AssistantChatModal({
  isOpen,
  onClose,
  onOpenContact,
  onSelectProduct,
  language = 'en',
}: AssistantChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am Triton's Virtual Product Assistant for car-lifts.co.za. How can I help you choose or understand our car lifts, spray booths, and workshop equipment today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // Accessibility zoom level (1.0 = 100%)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.15, 1.75));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.15, 0.85));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });

      const data = await res.json();
      const replyText = data.reply || "For exact pricing/specs on that, our sales team can help directly — call 021 556 2413 and they'll sort you out.";

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat Assistant error:", err);
      const errorMsg: Message = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: "For exact pricing/specs on that, our sales team can help directly — call 021 556 2413 and they'll sort you out.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: "Conversation reset. How can I assist you with Triton's equipment catalog or specifications?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="assistant-chat-container"
        className="bg-[#111111] border border-neutral-800 text-white w-[95vw] lg:w-[70vw] h-[85vh] lg:h-[70vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
      >
        {/* Header */}
        <div className="bg-[#181818] px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[#ff0000]/15 border border-[#ff0000]/30 flex items-center justify-center text-[#ff0000]">
                <Bot size={22} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#181818]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wide flex items-center gap-2">
                Triton Virtual Product Assistant
                <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                  OFFICIAL AI
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400 font-sans">
                Cape Town Showroom & Technical Support • Call 021 556 2413
              </p>
            </div>
          </div>

          {/* Zoom and Controls Cluster */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Accessibility Zoom Control for Visually Impaired Customers */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 text-xs text-neutral-300">
              <span className="text-[10px] font-mono text-neutral-400 pl-1 hidden sm:inline flex items-center gap-1">
                <Eye size={12} className="text-[#ff0000]" /> Zoom:
              </span>
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.85}
                className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-300 hover:text-white cursor-pointer transition-colors"
                title="Decrease font size / Zoom out"
                aria-label="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-neutral-300 hover:text-white cursor-pointer hover:bg-neutral-800 rounded"
                title="Reset zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 1.75}
                className="p-1 rounded hover:bg-neutral-800 disabled:opacity-30 text-neutral-300 hover:text-white cursor-pointer transition-colors"
                title="Increase font size / Zoom in (Accessibility)"
                aria-label="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Reset Chat"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Assistant Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quick Direct Handoff Call Banner */}
        <div className="bg-[#1e1414] border-b border-[#ff0000]/20 px-4 py-2 flex items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-neutral-300 font-mono" style={{ fontSize: `${Math.max(10, zoomLevel * 11)}px` }}>
            <Phone size={13} className="text-[#ff0000] shrink-0" />
            <span>Need a custom quote, install or site visit?</span>
          </div>
          <a
            href="tel:0215562413"
            className="px-2.5 py-1 bg-[#ff0000] hover:bg-[#cc0000] text-white font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 shrink-0"
            style={{ fontSize: `${Math.max(10, zoomLevel * 10)}px` }}
          >
            Call 021 556 2413
          </a>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-[#ff0000]/10 border border-[#ff0000]/30 flex items-center justify-center text-[#ff0000] shrink-0 mt-0.5">
                  <Bot size={17} />
                </div>
              )}

              <div className={`max-w-[85%] space-y-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#ff0000] text-white rounded-br-xs font-medium'
                      : 'bg-[#1a1a1a] border border-neutral-800 text-neutral-200 rounded-bl-xs'
                  }`}
                  style={{ fontSize: `${zoomLevel * 12}px` }}
                >
                  <div>
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-line font-sans font-medium" style={{ fontSize: `${zoomLevel * 12}px` }}>{msg.text}</p>
                    ) : (
                      renderFormattedMessage(msg.text, onSelectProduct, zoomLevel)
                    )}
                  </div>
                </div>
                <span className="text-neutral-500 font-mono block px-1" style={{ fontSize: `${Math.max(9, zoomLevel * 10)}px` }}>
                  {msg.timestamp}
                </span>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-300 shrink-0 mt-0.5">
                  <User size={17} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-lg bg-[#ff0000]/10 border border-[#ff0000]/30 flex items-center justify-center text-[#ff0000] shrink-0">
                <Bot size={17} />
              </div>
              <div className="bg-[#1a1a1a] border border-neutral-800 text-neutral-400 p-3 rounded-2xl rounded-bl-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-[#ff0000] rounded-full animate-ping" />
                <span className="font-mono" style={{ fontSize: `${zoomLevel * 12}px` }}>Consulting Triton technical database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions */}
        <div className="px-4 py-2 border-t border-neutral-800 bg-[#141414] shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Sparkles size={14} className="text-[#ff0000] shrink-0" />
            {DEFAULT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-[#ff0000] text-neutral-300 hover:text-white rounded-full font-sans transition-colors cursor-pointer shrink-0"
                style={{ fontSize: `${Math.max(10, zoomLevel * 11)}px` }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Footer */}
        <div className="p-3.5 bg-[#181818] border-t border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about 2-post lifts, spray booths, warranty, specs..."
              className="flex-1 bg-neutral-900 border border-neutral-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#ff0000] placeholder-neutral-500 font-sans transition-all"
              style={{ fontSize: `${Math.max(11, zoomLevel * 12)}px` }}
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !inputValue.trim()}
              className="p-3 bg-[#ff0000] hover:bg-[#cc0000] disabled:bg-neutral-800 text-white rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Send Message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

