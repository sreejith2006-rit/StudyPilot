"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Brain, Award, ArrowRight, HelpCircle, Check, X, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";

export default function QuizGeneratorPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  // Form State
  const [selectedDoc, setSelectedDoc] = useState("");
  const [quizType, setQuizType] = useState("MCQ");
  const [numQuestions, setNumQuestions] = useState(5);
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);

  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittingAttempt, setSubmittingAttempt] = useState(false);

  // Results State
  const [attemptResult, setAttemptResult] = useState<any>(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const docs = await api.documents.list();
        setDocuments(docs);
      } catch (e) {
        console.error("Failed to load documents", e);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDocuments();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const quiz = await api.quizzes.generate({
        document_id: selectedDoc || undefined,
        type: quizType,
        num_questions: numQuestions,
        topic: topic || undefined
      });
      setActiveQuiz(quiz);
      setAnswers({});
      setAttemptResult(null);
    } catch (err) {
      console.error("Failed to generate quiz", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerSelect = (qId: number, answer: string) => {
    setAnswers({ ...answers, [qId]: answer });
  };

  const handleSubmitAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < activeQuiz.questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setSubmittingAttempt(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        question_id: parseInt(qId),
        answer: ans
      }));
      const results = await api.quizzes.submitAttempt(activeQuiz._id, formattedAnswers);
      setAttemptResult(results);
      setActiveQuiz(null);
    } catch (err) {
      console.error("Failed to submit quiz attempt", err);
    } finally {
      setSubmittingAttempt(false);
    }
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setAttemptResult(null);
    setAnswers({});
  };

  if (loadingDocs) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-12 w-64 bg-white/5 rounded-xl" />
        <div className="h-96 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-white max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Quiz Generator</h1>
        <p className="text-sm text-muted-text mt-0.5">Test your comprehension. Generate custom quizzes directly from your study resources.</p>
      </div>

      {/* State 1: Configuration Form */}
      {!activeQuiz && !attemptResult && (
        <Card className="max-w-2xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-indigo" />
              Configure Study Quiz
            </CardTitle>
            <CardDescription>Setup questions from your library or specify a custom topic.</CardDescription>
          </CardHeader>
          <form onSubmit={handleGenerate}>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-semibold text-muted-text uppercase tracking-wider pl-1">
                  Source Study Document
                </label>
                <select 
                  value={selectedDoc} 
                  onChange={(e) => setSelectedDoc(e.target.value)}
                  className="glass-input px-4 py-3 text-sm focus:ring-2 focus:ring-primary-indigo/20 border-white/10"
                >
                  <option value="">General (No document, prompt-based topic)</option>
                  {documents.map((doc) => (
                    <option key={doc._id} value={doc._id}>{doc.filename} ({doc.file_type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-semibold text-muted-text uppercase tracking-wider pl-1">
                    Question Type
                  </label>
                  <select 
                    value={quizType} 
                    onChange={(e) => setQuizType(e.target.value)}
                    className="glass-input px-4 py-3 text-sm focus:ring-2 focus:ring-primary-indigo/20 border-white/10"
                  >
                    <option value="MCQ">Multiple Choice Questions (MCQ)</option>
                    <option value="TF">True / False (TF)</option>
                    <option value="Short">Short Answer Questions</option>
                    <option value="Mixed">Mixed Set</option>
                  </select>
                </div>
                <Input
                  label="Number of Questions"
                  type="number"
                  min="3"
                  max="20"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                  required
                />
              </div>

              <Input
                label="Topic Subject Focus (Optional)"
                type="text"
                placeholder="e.g. Distributed Consensus Systems"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                helperText="If no document is selected, the AI will use this prompt topic to draft questions."
              />
            </CardContent>
            <div className="p-6 pt-0 border-t border-white/[0.04] mt-4 flex justify-end">
              <Button variant="primary" type="submit" disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  "Generate Practice Quiz"
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* State 2: Active Quiz Testing Panel */}
      {activeQuiz && (
        <Card className="max-w-3xl mx-auto w-full">
          <CardHeader className="border-b border-white/[0.04] pb-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-primary-indigo" />
              Attempting Quiz
            </CardTitle>
            <CardDescription>Select answers and submit for grading.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmitAttempt}>
            <CardContent className="p-6 space-y-6">
              {activeQuiz.questions.map((q: any, index: number) => (
                <div key={q.id} className="space-y-3 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                  <h4 className="text-sm font-bold text-white flex items-start gap-2.5">
                    <span className="text-primary-indigo">{index + 1}.</span>
                    {q.question_text}
                  </h4>
                  
                  {/* MCQ / TF Option Selection */}
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2.5 pl-5">
                      {q.options.map((opt: string) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <div 
                            key={opt}
                            onClick={() => handleAnswerSelect(q.id, opt)}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-primary-indigo/15 border-primary-indigo text-white" 
                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 text-muted-text hover:text-white"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-primary-indigo" : "border-white/20"
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary-indigo" />}
                            </div>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Short Answer Input */
                    <div className="pl-5">
                      <textarea
                        placeholder="Type your explanation here..."
                        value={answers[q.id] || ""}
                        onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                        className="w-full glass-input p-3.5 text-xs rounded-xl focus:ring-2 focus:ring-primary-indigo/20 border-white/10 min-h-[80px]"
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
            <div className="p-6 pt-0 border-t border-white/[0.04] mt-4 flex justify-between items-center">
              <Button variant="ghost" type="button" onClick={resetQuiz}>
                Cancel Quiz
              </Button>
              <Button variant="primary" type="submit" disabled={submittingAttempt}>
                {submittingAttempt ? "Evaluating Answers..." : "Submit Quiz"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* State 3: Quiz Evaluation Results */}
      {attemptResult && (
        <Card className="max-w-3xl mx-auto w-full">
          <CardHeader className="text-center border-b border-white/[0.04] pb-6">
            <div className="mx-auto p-3.5 rounded-full bg-gradient-to-tr from-primary-indigo to-primary-violet text-white shadow-lg w-fit mb-3">
              <Award className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-black text-white">Quiz Completed!</CardTitle>
            <div className="mt-4 flex justify-center gap-8 text-center">
              <div>
                <p className="text-xs text-muted-text font-bold uppercase tracking-wider">Score</p>
                <p className="text-2xl font-black text-white mt-1">{attemptResult.score} / {attemptResult.total_questions}</p>
              </div>
              <div>
                <p className="text-xs text-muted-text font-bold uppercase tracking-wider">Accuracy</p>
                <p className={`text-2xl font-black mt-1 ${attemptResult.accuracy >= 70 ? "text-success" : "text-danger"}`}>
                  {attemptResult.accuracy.toFixed(0)}%
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-white pl-1">Review Questions:</h3>
            <div className="space-y-4">
              {attemptResult.answers_evaluation.map((evalItem: any, index: number) => (
                <div key={index} className="p-4.5 rounded-xl bg-white/[0.01] border border-white/5 flex gap-4">
                  {evalItem.is_correct ? (
                    <div className="p-1.5 rounded-lg bg-success/10 border border-success/20 text-success shrink-0 h-fit mt-0.5">
                      <Check className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-danger/10 border border-danger/20 text-danger shrink-0 h-fit mt-0.5">
                      <X className="w-4.5 h-4.5" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">{index + 1}. {evalItem.question_text}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-muted-text font-semibold uppercase tracking-wider text-[9px] block">Your Answer:</span>
                        <span className={`font-semibold ${evalItem.is_correct ? "text-success" : "text-danger"}`}>{evalItem.submitted_answer || "(Blank)"}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-success/5 border border-success/15">
                        <span className="text-success/70 font-semibold uppercase tracking-wider text-[9px] block">Correct Answer:</span>
                        <span className="font-semibold text-success">{evalItem.correct_answer}</span>
                      </div>
                    </div>
                    {evalItem.explanation && (
                      <div className="p-3 bg-white/[0.01] border-l-2 border-primary-indigo rounded-r-lg text-xs leading-relaxed text-muted-text mt-2">
                        <span className="font-bold text-white block mb-1">Explanation:</span>
                        {evalItem.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/[0.04] p-6">
            <Button variant="primary" onClick={resetQuiz} className="font-bold">
              Attempt Another Quiz
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
