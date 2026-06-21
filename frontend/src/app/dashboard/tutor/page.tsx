"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, Quote } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import api from "@/services/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  citations?: string[];
  timestamp: Date;
}

export default function AITutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your StudyPilot AI Tutor. Ask me any question about your uploaded syllabi, lecture notes, or past papers. I will answer strictly using your materials and provide citations.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: "user",
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await api.tutor.ask(userMsg.text);
      const botMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: "bot",
        text: response.answer,
        citations: response.citations,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        sender: "bot",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto h-[calc(100vh-160px)]">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">AI Tutor</h1>
        <p className="text-sm text-muted-text mt-0.5">RAG Chatbot. Ask questions and review direct source citations from uploaded documents.</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 bg-[rgba(13,13,25,0.4)] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-indigo/10 border border-primary-indigo/25 text-primary-indigo">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">StudyPilot RAG Tutor</h3>
              <p className="text-[10px] text-success font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                Context Lock: Active
              </p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-primary-violet" />
        </div>

        {/* Scrollable Messages Panel */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.map((msg) => {
            const isBot = msg.sender === "bot";
            return (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isBot ? "self-start" : "self-end flex-row-reverse"}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 text-white font-bold select-none ${
                  isBot 
                    ? "bg-gradient-to-tr from-primary-indigo to-primary-violet border-primary-indigo/30" 
                    : "bg-white/[0.05] border-white/10"
                }`}>
                  {isBot ? <Bot className="w-4.5 h-4.5" /> : <User className="w-4.5 h-4.5" />}
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* Speech Bubble */}
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                    isBot 
                      ? "bg-white/[0.02] border-white/5 rounded-tl-sm text-white" 
                      : "bg-primary-indigo hover:bg-primary-indigo/95 border-primary-indigo/20 rounded-tr-sm text-white"
                  }`}>
                    {isBot ? (
                      <MarkdownRenderer content={msg.text} />
                    ) : (
                      msg.text
                    )}

                    {/* Citations Box */}
                    {isBot && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/[0.04] flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-text font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          Source Citations:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.citations.map((cit, i) => (
                            <span 
                              key={i} 
                              className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-primary-violet hover:border-primary-violet/30 transition-colors font-semibold"
                            >
                              {cit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className={`text-[9px] text-muted-text pl-1 ${isBot ? "" : "text-right pr-1"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-indigo to-primary-violet flex items-center justify-center border border-primary-indigo/30 text-white font-bold animate-pulse">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-sm bg-white/[0.02] border border-white/5 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Footer Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-white/[0.04] bg-white/[0.01] flex gap-3">
          <Input
            type="text"
            placeholder="Ask a question about your uploaded materials..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-xl bg-white/[0.02]"
            required
          />
          <Button variant="primary" type="submit" size="sm" className="px-5 shrink-0" disabled={loading}>
            <Send className="w-4.5 h-4.5" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
