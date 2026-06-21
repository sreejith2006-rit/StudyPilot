"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  BookOpen, 
  Award, 
  ArrowRight,
  ListRestart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";


export default function AISummarizerPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [isCached, setIsCached] = useState<boolean>(false);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const steps = [
    "Reading file source text...",
    "Segmenting structure & logic...",
    "Extracting key terms & definitions...",
    "Generating executive summaries...",
    "Formatting study recommendations..."
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  // Update progress steps animation during summary load
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loadingSummary) {
      setProgressStep(0);
      interval = setInterval(() => {
        setProgressStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loadingSummary]);

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const docs = await api.documents.list();
      setDocuments(docs);
      if (docs.length > 0) {
        // Default select first doc
        setSelectedDocId(docs[0]._id);
        if (docs[0].summary) {
          setSummary(docs[0].summary);
          setIsCached(true);
        }
      }
    } catch (e) {
      console.error("Failed to load documents", e);
      setErrorMsg("Failed to load documents list.");
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDocChange = (docId: string) => {
    setSelectedDocId(docId);
    setSummary("");
    setIsCached(false);
    setErrorMsg("");
    
    // Check if selected doc already has summary cached in our local state list
    const foundDoc = documents.find(d => d._id === docId);
    if (foundDoc && foundDoc.summary) {
      setSummary(foundDoc.summary);
      setIsCached(true);
    }
  };

  const handleGenerateSummary = async (force = false) => {
    if (!selectedDocId) return;
    setLoadingSummary(true);
    setErrorMsg("");
    setSummary("");

    try {
      const res = await api.documents.summarize(selectedDocId, force);
      setSummary(res.summary);
      setIsCached(res.cached);
      
      // Update our local state documents list with the newly loaded summary so it stays cached in state
      setDocuments(prev => prev.map(d => d._id === selectedDocId ? { ...d, summary: res.summary } : d));
    } catch (e: any) {
      console.error("Failed to generate summary", e);
      setErrorMsg(e.message || "Failed to generate AI study guide summary. Please try again.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownload = () => {
    if (!summary || !selectedDocId) return;
    const doc = documents.find(d => d._id === selectedDocId);
    const filename = doc ? doc.filename.split(".")[0] : "study_guide";
    
    const blob = new Blob([summary], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}_study_guide.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSelectedDocFilename = () => {
    const doc = documents.find(d => d._id === selectedDocId);
    return doc ? doc.filename : "document";
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return "";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loadingDocs) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-10 w-48 bg-white/5 rounded-xl" />
        <div className="h-20 bg-white/5 rounded-xl" />
        <div className="h-96 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto min-h-screen pb-16">
      {/* Header Titles */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary-indigo" />
          AI Summarizer
        </h1>
        <p className="text-sm text-muted-text mt-0.5">Transform bulky lecture notes, PDF papers, or presentations into crisp study guides and cheat sheets.</p>
      </div>

      {documents.length === 0 ? (
        /* Empty State */
        <Card className="border border-white/5 bg-[rgba(13,13,25,0.4)] mt-4">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-muted-text mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-white text-base">No Documents Found</h3>
            <p className="text-xs text-muted-text mt-1 max-w-xs leading-relaxed">You need to upload notes or a syllabus in the Upload Center before generating study guides.</p>
            <Link href="/dashboard/upload" className="mt-6">
              <Button variant="primary" size="sm" className="font-bold">
                Go to Upload Center
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        /* Summarizer Control Layout */
        <div className="flex flex-col gap-6">
          {/* Document Selector Panel */}
          <Card className="bg-[rgba(13,13,25,0.3)] border-white/5">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-text block mb-2">Select Study Material</label>
                <div className="relative">
                  <select 
                    value={selectedDocId} 
                    onChange={(e) => handleDocChange(e.target.value)}
                    disabled={loadingSummary}
                    className="w-full glass-input px-4 py-2.5 text-sm font-semibold pr-10 cursor-pointer disabled:opacity-50 select-none appearance-none"
                  >
                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id} className="bg-background text-white font-medium">
                        {doc.filename} ({doc.file_type.toUpperCase()} - {formatBytes(doc.file_size)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-text">
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>

              {!summary && !loadingSummary && (
                <Button 
                  variant="primary" 
                  className="sm:mt-6 shrink-0 font-bold"
                  onClick={() => handleGenerateSummary(false)}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate AI Summary
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Action Status Messages */}
          {errorMsg && (
            <div className="p-4 rounded-xl flex items-center gap-3 border bg-danger/10 border-danger/30 text-danger">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Core Content Area */}
          <AnimatePresence mode="wait">
            {loadingSummary ? (
              /* Loading Step Progress Animation */
              <motion.div 
                key="loading-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border border-white/5 bg-[rgba(13,13,25,0.4)]">
                  <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 rounded-full bg-primary-indigo/20 blur-xl w-16 h-16 animate-pulse" />
                      <div className="p-5 rounded-full bg-white/[0.02] border border-white/5 text-primary-indigo relative z-10 animate-spin">
                        <RefreshCw className="w-7 h-7" />
                      </div>
                    </div>
                    <h3 className="font-extrabold text-white text-base">Creating Your Study Summary</h3>
                    <p className="text-xs text-muted-text mt-1 max-w-xs">Gemini AI is parsing and condensing your uploaded notes.</p>
                    
                    {/* Animated Step-by-Step Tracker */}
                    <div className="mt-8 flex flex-col gap-2.5 max-w-sm w-full">
                      {steps.map((step, idx) => {
                        const isActive = idx === progressStep;
                        const isCompleted = idx < progressStep;
                        return (
                          <div 
                            key={idx}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs transition-all duration-300 ${
                              isActive 
                                ? "bg-primary-indigo/10 border-primary-indigo/35 text-white scale-[1.02] font-semibold" 
                                : isCompleted 
                                  ? "bg-success/5 border-success/15 text-success" 
                                  : "bg-white/[0.01] border-white/5 text-muted-text opacity-40"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : isActive ? (
                              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-primary-indigo" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                            )}
                            <span className="truncate">{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : summary ? (
              /* Display Generated Summary */
              <motion.div
                key="summary-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6"
              >
                {/* Main Summary Reader */}
                <div className="lg:col-span-3">
                  <Card className="overflow-hidden">
                    <CardHeader className="border-b border-white/[0.04] bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary-indigo/10 border border-primary-indigo/25 text-primary-indigo">
                            AI Study Guide
                          </span>
                          {isCached && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-muted-text">
                              Cached
                            </span>
                          )}
                        </div>
                        <CardTitle className="mt-2 text-base max-w-[450px] truncate">{getSelectedDocFilename()}</CardTitle>
                      </div>
                      
                      {/* Reader Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-9 px-3 text-xs" 
                          onClick={handleCopy}
                          title="Copy Summary"
                        >
                          {copySuccess ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-success" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-9 px-3 text-xs" 
                          onClick={handleDownload}
                          title="Download Markdown"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {/* Rendered Text */}
                    <CardContent className="p-6 md:p-8 bg-card-bg/20 min-h-[400px]">
                      <MarkdownRenderer content={summary} />
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Context Suggestion Widget */}
                <div className="flex flex-col gap-6">
                  {/* Regeneration Card */}
                  <Card className="bg-gradient-to-tr from-primary-violet/5 via-transparent to-transparent">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Summary Actions</CardTitle>
                      <CardDescription>Update your cached AI study guide</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button 
                        variant="secondary" 
                        className="w-full text-xs font-semibold py-2.5 gap-2 border-white/5 hover:border-primary-violet/30"
                        onClick={() => handleGenerateSummary(true)}
                      >
                        <ListRestart className="w-4.5 h-4.5 text-primary-violet" />
                        Re-generate Summary
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Suggestion Navigation Options */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Study Next Steps</CardTitle>
                      <CardDescription>Convert your summary into active learning</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2.5 pt-2">
                      <Link href="/dashboard/quiz">
                        <Button variant="secondary" className="w-full justify-start text-[11px] font-bold gap-3.5 py-3 border border-white/5 hover:border-primary-indigo/35">
                          <Award className="w-4.5 h-4.5 text-primary-indigo shrink-0" />
                          Generate Practice Quiz
                        </Button>
                      </Link>
                      <Link href="/dashboard/tutor">
                        <Button variant="secondary" className="w-full justify-start text-[11px] font-bold gap-3.5 py-3 border border-white/5 hover:border-primary-violet/35">
                          <BookOpen className="w-4.5 h-4.5 text-primary-violet shrink-0" />
                          Discuss Topic with Tutor
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ) : (
              /* Initial State: Choose File Prompt */
              <motion.div
                key="empty-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border border-white/5 bg-[rgba(13,13,25,0.4)]">
                  <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 text-primary-indigo mb-4 animate-pulse">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h3 className="font-extrabold text-white text-base">Generate Document Study Guide</h3>
                    <p className="text-xs text-muted-text mt-1.5 max-w-sm leading-relaxed">
                      Select **{getSelectedDocFilename()}** or choose another file above and generate a structured summary. The guide includes key terms, topic outlines, and study action plans.
                    </p>
                    <Button 
                      variant="primary" 
                      className="mt-6 font-bold" 
                      onClick={() => handleGenerateSummary(false)}
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Study Guide Now
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
