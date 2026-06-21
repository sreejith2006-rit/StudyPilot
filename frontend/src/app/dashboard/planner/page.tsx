"use client";

import { useEffect, useState } from "react";
import { Calendar, Hourglass, Plus, CheckCircle, Clock, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/services/api";

export default function StudyPlannerPage() {
  const [activePlan, setActivePlan] = useState<any>(null);
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState("4");
  const [subjects, setSubjects] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadActivePlan();
  }, []);

  const loadActivePlan = async () => {
    setLoading(true);
    setError("");
    try {
      const plan = await api.plans.getActive();
      setActivePlan(plan);
    } catch (e) {
      // 404 is expected if they don't have a plan
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examDate || !dailyHours || !subjects) {
      setError("All fields are required");
      return;
    }

    const numHours = parseFloat(dailyHours);
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      setError("Daily study hours must be a valid number between 0.5 and 24");
      return;
    }

    const subjectList = subjects.split(",").map(s => s.trim()).filter(s => s.length > 0);
    if (subjectList.length === 0) {
      setError("Please list at least one subject");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const newPlan = await api.plans.generate({
        exam_date: examDate,
        daily_study_hours: numHours,
        subjects: subjectList
      });
      setActivePlan(newPlan);
    } catch (err: any) {
      setError(err.message || "Failed to create study plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTask = async (dateKey: string, taskId: string, currentCompleted: boolean) => {
    try {
      await api.plans.updateTask(dateKey, taskId, !currentCompleted);
      
      // Toggle local state
      if (activePlan) {
        const updatedDaily = { ...activePlan.daily_plan };
        updatedDaily[dateKey] = updatedDaily[dateKey].map((t: any) => 
          t.id === taskId ? { ...t, completed: !currentCompleted } : t
        );
        setActivePlan({ ...activePlan, daily_plan: updatedDaily });
      }
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse max-w-5xl mx-auto">
        <div className="h-12 w-64 bg-white/5 rounded-xl" />
        <div className="h-96 bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-white max-w-5xl mx-auto px-4 md:px-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">Study Planner</h1>
        <p className="text-sm text-muted-text mt-0.5">Let AI compile detailed study roadmaps and weekly goals tailored to your exam date.</p>
      </div>

      {!activePlan ? (
        /* Plan Creator Form */
        <Card className="max-w-full w-full mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-indigo" />
              Generate Study Roadmap
            </CardTitle>
            <CardDescription>Input your goals to build a dynamic schedule mapping milestones day-by-day.</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreatePlan}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-semibold text-center">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Target Exam Date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={new Date().toLocaleDateString('sv-SE')}
                  required
                />
                <Input
                  label="Daily Study Commitment (Hours)"
                  type="number"
                  placeholder="e.g. 4"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  min="0.5"
                  max="24"
                  step="0.5"
                  required
                />
              </div>

              <Input
                label="Subjects (comma separated)"
                type="text"
                placeholder="e.g. Compiler Design, Computer Networks, Software Engineering"
                value={subjects}
                onChange={(e) => setSubjects(e.target.value)}
                helperText="List the primary subjects you need to cover before the exam."
                required
              />
            </CardContent>
            <div className="p-6 pt-0 border-t border-white/[0.04] mt-4 flex justify-end">
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Compiling Study Plan...
                  </>
                ) : (
                  "Compile AI Study Plan"
                )}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* Plan Viewer */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Daily Schedule Breakdown */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.04] pb-4">
                <div>
                  <CardTitle>Daily Task Logs</CardTitle>
                  <CardDescription>Track daily review requirements</CardDescription>
                </div>
                <Calendar className="w-5 h-5 text-primary-indigo" />
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {Object.keys(activePlan.daily_plan).sort().map((dateStr) => {
                  const tasks = activePlan.daily_plan[dateStr];
                  // Append T00:00:00 to prevent UTC timezone offset issues making dates appear as the previous day/month
                  const formattedDate = new Date(dateStr + "T00:00:00").toLocaleDateString([], { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  
                  return (
                    <div key={dateStr} className="space-y-2.5">
                      <h4 className="text-xs font-bold text-primary-indigo uppercase tracking-wider pl-1">{formattedDate}</h4>
                      <div className="flex flex-col gap-2">
                        {tasks.map((task: any) => (
                          <div 
                            key={task.id}
                            onClick={() => handleToggleTask(dateStr, task.id, task.completed)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                              task.completed 
                                ? "bg-success/5 border-success/20 hover:bg-success/10 text-muted-text" 
                                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10 text-white"
                            }`}
                          >
                            <div className="shrink-0">
                              {task.completed ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                <div className="w-5 h-5 rounded-md border border-white/20 group-hover:border-white/40 transition-colors" />
                              )}
                            </div>
                            <div className="flex-1">
                              <span className={`text-sm font-semibold ${task.completed ? "line-through" : ""}`}>
                                {task.title}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/[0.03] border border-white/5 text-muted-text">
                              {task.hours} Hrs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Weekly Milestones Column */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="border-b border-white/[0.04] pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary-violet" />
                  Weekly Milestones
                </CardTitle>
                <CardDescription>Major objectives to track your progress</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-4">
                {Object.keys(activePlan.weekly_plan).map((weekKey) => {
                  const item = activePlan.weekly_plan[weekKey];
                  const weekNum = weekKey.replace("week_", "");
                  return (
                    <div 
                      key={weekKey}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex gap-3 items-start"
                    >
                      <div className="w-6 h-6 rounded-md bg-primary-violet/10 border border-primary-violet/20 text-primary-violet flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 uppercase">
                        W{weekNum}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Week {weekNum} Goal</h4>
                        <p className="text-xs text-muted-text mt-1 leading-relaxed">{item.milestone}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            
            {/* Action Box to rebuild */}
            <Button variant="secondary" onClick={() => setActivePlan(null)} className="w-full font-bold">
              Re-generate Schedule
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
