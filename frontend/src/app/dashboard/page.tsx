"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Clock, 
  BookOpen, 
  Activity, 
  ArrowRight, 
  CheckSquare, 
  Square,
  AlertTriangle,
  Upload,
  MessageSquare,
  BrainCircuit,
  FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import api from "@/services/api";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [weakTopics, setWeakTopics] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [analyticsData, planData, topicsData, docsData] = await Promise.allSettled([
          api.analytics.get(),
          api.plans.getActive(),
          api.analytics.getWeakTopics(),
          api.documents.list()
        ]);

        if (analyticsData.status === "fulfilled") setAnalytics(analyticsData.value);
        if (planData.status === "fulfilled") setActivePlan(planData.value);
        if (topicsData.status === "fulfilled") setWeakTopics(topicsData.value);
        if (docsData.status === "fulfilled") setDocuments(docsData.value);
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleToggleTask = async (dateKey: string, taskId: string, currentCompleted: boolean) => {
    try {
      await api.plans.updateTask(dateKey, taskId, !currentCompleted);
      
      // Update local state for immediate feedback
      if (activePlan) {
        const updatedDaily = { ...activePlan.daily_plan };
        updatedDaily[dateKey] = updatedDaily[dateKey].map((t: any) => 
          t.id === taskId ? { ...t, completed: !currentCompleted } : t
        );
        setActivePlan({ ...activePlan, daily_plan: updatedDaily });
      }
      
      // Reload analytics to update progress bar
      const updatedAnalytics = await api.analytics.get();
      setAnalytics(updatedAnalytics);
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  const getDaysRemaining = () => {
    if (!activePlan?.exam_date) return null;
    // Append T00:00:00 to ensure the exam date is interpreted in local timezone
    const diffTime = new Date(activePlan.exam_date + "T00:00:00").getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getTodayTasks = () => {
    if (!activePlan?.daily_plan) return { date: "", tasks: [] };
    // Format local date to match ISO string stored
    const todayStr = new Date().toLocaleDateString('sv-SE');
    // Find closest date in plan if exact match not found
    const planDates = Object.keys(activePlan.daily_plan).sort();
    if (planDates.length === 0) return { date: "", tasks: [] };
    
    // For skeleton presentation, retrieve tasks of first planned date
    const targetDate = activePlan.daily_plan[todayStr] ? todayStr : planDates[0];
    return {
      date: targetDate,
      tasks: activePlan.daily_plan[targetDate] || []
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-12 w-64 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const todayData = getTodayTasks();
  const daysLeft = getDaysRemaining();

  return (
    <div className="flex flex-col gap-6 text-white">
      {/* Top Banner Actions */}
      {!activePlan && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="bg-gradient-to-r from-primary-indigo/20 to-primary-violet/10 border-primary-indigo/30">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex gap-4">
                <div className="p-3 bg-primary-indigo/10 rounded-xl border border-primary-indigo/20 text-primary-indigo">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Setup Your Study Program</h3>
                  <p className="text-xs text-muted-text mt-0.5">Let AI construct a tailored study calendar matching your upcoming exam deadlines.</p>
                </div>
              </div>
              <Link href="/dashboard/planner">
                <Button variant="primary" size="sm" className="font-bold shrink-0">
                  Create Study Plan
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Grid Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.0 }}
        >
          <Card className="bg-gradient-to-tr from-primary-indigo/10 to-transparent">
            <CardHeader className="pb-1">
              <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Exam Countdown</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-black text-white">{daysLeft !== null ? daysLeft : "--"}</span>
              <span className="text-xs text-muted-text font-bold uppercase">{daysLeft === 1 ? "Day left" : "Days left"}</span>
            </CardContent>
          </Card>
        </motion.div>


        {/* Study Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <Card>
            <CardHeader className="pb-1">
              <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Course Progress</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">{analytics?.completion_percentage?.toFixed(0) || 0}% Complete</span>
                <span className="text-[10px] font-bold text-primary-indigo uppercase">Syllabus</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div 
                  className="bg-gradient-to-r from-primary-indigo to-primary-violet h-full transition-all duration-500"
                  style={{ width: `${analytics?.completion_percentage || 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quiz Readiness */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[rgba(10,10,20,0.4)] backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 -mt-2 -mr-2 bg-gradient-radial from-primary-violet/20 to-transparent w-24 h-24 rounded-full blur-2xl pointer-events-none" />
          <Card className="bg-transparent border-none shadow-none h-full relative z-10">
            <CardHeader className="pb-1">
              <CardDescription className="text-muted-text uppercase font-bold tracking-wider">Exam Readiness</CardDescription>
            </CardHeader>
            <CardContent className="flex items-baseline gap-2 pt-2">
              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-indigo to-primary-violet">{analytics?.exam_readiness_score?.toFixed(0) || 0}%</span>
              <span className="text-xs text-muted-text font-bold uppercase">Ready</span>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Today's Tasks */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.04] pb-4">
              <div>
                <CardTitle>Today's Focus Tasks</CardTitle>
                <CardDescription>Click to mark tasks completed and update syllabus metrics</CardDescription>
              </div>
              <Clock className="w-5 h-5 text-primary-indigo" />
            </CardHeader>
            <CardContent className="p-6">
              {todayData && todayData.tasks?.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {todayData.tasks.map((task: any) => (
                    <div 
                      key={task.id}
                      onClick={() => handleToggleTask(todayData.date, task.id, task.completed)}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer group"
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-muted-text group-hover:text-white shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className={`text-sm font-semibold leading-none ${task.completed ? "line-through text-muted-text" : "text-white"}`}>
                          {task.title}
                        </span>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-indigo/10 border border-primary-indigo/20 text-primary-indigo font-bold">{task.hours} Hrs</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-text">No active study tasks scheduled for today.</p>
                  <Link href="/dashboard/planner">
                    <Button variant="secondary" size="sm" className="mt-4 font-bold">
                      Generate Schedule
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Recommendation Card */}
          <Card className="bg-gradient-to-br from-primary-violet/10 via-transparent to-transparent border-primary-violet/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-violet" />
                AI Smart Suggestion
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-text leading-relaxed">
                {weakTopics.length > 0 
                  ? `We noticed your accuracy is slightly lower on "${weakTopics[0].topic_name}". We suggest uploading matching notes and starting a revision session or taking a focused 5-question MCQ quiz.`
                  : "Excellent progress! You have no recorded weak areas yet. Upload more lectures notes, syllabus materials, and attempt quizzes to generate personal suggestions."}
              </p>
              <div className="mt-4 flex gap-3">
                <Link href="/dashboard/quiz">
                  <Button variant="primary" size="sm" className="font-bold">
                    Start Mock Quiz
                  </Button>
                </Link>
                <Link href="/dashboard/tutor">
                  <Button variant="secondary" size="sm" className="font-bold">
                    Ask AI Tutor
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widget Columns */}
        <div className="flex flex-col gap-6">
          {/* Quick Action Cards */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2.5 pt-0">
              <Link href="/dashboard/upload">
                <Button variant="secondary" className="w-full justify-start text-xs font-bold gap-3 py-3 border border-white/5 hover:border-primary-indigo/30">
                  <Upload className="w-4 h-4 text-primary-indigo" />
                  Upload Notes & Syllabus
                </Button>
              </Link>
              <Link href="/dashboard/tutor">
                <Button variant="secondary" className="w-full justify-start text-xs font-bold gap-3 py-3 border border-white/5 hover:border-primary-violet/30">
                  <MessageSquare className="w-4 h-4 text-primary-violet" />
                  Chat with AI Tutor
                </Button>
              </Link>
              <Link href="/dashboard/summarizer">
                <Button variant="secondary" className="w-full justify-start text-xs font-bold gap-3 py-3 border border-white/5 hover:border-primary-indigo/30">
                  <FileText className="w-4 h-4 text-primary-indigo" />
                  Summarize Study Documents
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Weak Topics */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weak Topics Tracker</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 pt-0">
              {weakTopics.length > 0 ? (
                weakTopics.map((topic, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-danger/5 border border-danger/10 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-danger" />
                      <span className="font-bold text-white max-w-[120px] truncate">{topic.topic_name}</span>
                    </div>
                    <span className="font-semibold px-2 py-0.5 rounded bg-danger/10 border border-danger/20 text-danger uppercase text-[9px]">{topic.occurrences} misses</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-text">No weak topics recorded yet. Quiz attempts will log items here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 pt-0">
              {documents.slice(0, 3).map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                  <span className="font-bold text-white truncate max-w-[150px]">{doc.filename}</span>
                  <span className="text-[10px] text-muted-text uppercase font-bold">{doc.file_type}</span>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-text">No files uploaded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
