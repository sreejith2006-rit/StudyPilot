"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Sparkles, Brain, UploadCloud, Calendar, Award, 
  ArrowRight, Zap, ChevronDown, CheckCircle2,
  Star, BarChart3, Clock, Target, Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Multi-Format Upload Center",
    desc: "Seamlessly ingest your syllabus, lecture notes, PPTX slides, and previous year exam papers in one centralized vault.",
    colSpan: "md:col-span-2"
  },
  {
    icon: Brain,
    title: "Context-Aware AI Tutor",
    desc: "Ask questions and get answers with direct source citations, restricted exclusively to your uploaded materials. No hallucinations.",
    colSpan: "md:col-span-1"
  },
  {
    icon: Calendar,
    title: "Dynamic Study Planner",
    desc: "Enter your exam date and subjects. Our AI generates tailored daily schedules that auto-adjust if you fall behind.",
    colSpan: "md:col-span-1"
  },
  {
    icon: Target,
    title: "Targeted Mock Exams",
    desc: "Generate custom MCQs, short answers, or true/false exams. Let AI grade your answers and pinpoint weak topics instantly.",
    colSpan: "md:col-span-2"
  }
];

const TESTIMONIALS = [
  {
    name: "Sarah Jenkins",
    role: "Computer Science Student",
    text: "StudyPilot completely changed how I prep for finals. The AI tutor referencing my exact slides is a game-changer.",
    rating: 5
  },
  {
    name: "Michael Chang",
    role: "Medical Student",
    text: "The dynamic planner saved my life. When I missed a day of studying, it automatically redistributed my workload. Brilliant.",
    rating: 5
  },
  {
    name: "Priya Patel",
    role: "Engineering Major",
    text: "Generating practice quizzes from my own syllabus helped me identify weak spots before the actual exam. Highly recommend!",
    rating: 5
  }
];

const FAQS = [
  {
    q: "How does the AI Tutor ensure answers are accurate?",
    a: "StudyPilot AI uses advanced Retrieval-Augmented Generation (RAG). It only answers questions using the notes, files, or syllabus you specifically upload. If the answer isn't in your document, it won't guess—it will tell you the information is missing."
  },
  {
    q: "Can I upload slideshows and Word files too?",
    a: "Absolutely. We support PDF, DOCX, TXT, and PPTX formats. The AI seamlessly parses text and slide content to build your personalized knowledge base."
  },
  {
    q: "What happens if I miss a daily study task?",
    a: "No stress! The AI Study Planner tracks your completed tasks and automatically shifts missed deadlines to keep your exam preparation realistic and achievable."
  },
  {
    q: "Is there a limit to how many files I can upload?",
    a: "Free users can upload up to 50MB of documents per workspace. Our Pro tier offers unlimited uploads and priority AI processing speed."
  }
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

function FaqItem({ q, a }: { q: string, a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden transition-colors hover:bg-white/[0.04]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
      >
        <span className="font-semibold text-white/90">{q}</span>
        <ChevronDown className={`w-5 h-5 text-white/50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-5 text-muted-text text-sm leading-relaxed border-t border-white/5 pt-4">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PremiumLandingPage() {
  return (
    <div className="min-h-screen bg-[#030014] text-white selection:bg-primary-indigo/30 overflow-hidden font-sans">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-indigo/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-violet/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-[#030014]/50 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="shrink-0 relative w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-indigo to-primary-violet p-0.5 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full z-20" />
              <img src="/logo.jpg" alt="StudyPilot Logo" className="w-full h-full rounded-[10px] object-cover relative z-10" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-wider text-white">
                STUDYPILOT <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-indigo to-primary-violet font-black">AI</span>
              </h1>
            </div>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
              <Link href="#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
              <Link href="#testimonials" className="hover:text-white transition-colors">Testimonials</Link>
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-white/10">
              <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm" className="font-bold rounded-full px-5 hidden sm:flex">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-20">
        
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-indigo/10 border border-primary-indigo/20 text-xs font-bold text-primary-indigo mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary-indigo animate-pulse" />
            StudyPilot AI 2.0 is now live
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl leading-[1.1]"
          >
            Aura for your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-indigo via-[#818cf8] to-primary-violet">
              Academic Success.
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-white/60 text-lg md:text-xl max-w-2xl mt-8 leading-relaxed font-medium"
          >
            Upload your syllabus and materials. Let our AI build your study roadmap, grade your practice exams, and act as your 24/7 personal tutor.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto"
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto font-black rounded-full px-8 h-14 text-base group shadow-xl shadow-primary-indigo/30">
                Start For Free
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

          </motion.div>

          {/* Social Proof */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-20 pt-10 border-t border-white/10 w-full max-w-3xl flex flex-col items-center gap-6"
          >
            <p className="text-sm font-semibold text-white/40 uppercase tracking-widest">Trusted by students at</p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale">
              {/* Placeholders for University Logos */}
              <div className="text-xl font-black font-serif">STANFORD</div>
              <div className="text-xl font-black font-serif">MIT</div>
              <div className="text-xl font-black font-serif">HARVARD</div>
              <div className="text-xl font-black font-serif">OXFORD</div>
            </div>
          </motion.div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Supercharge your studies.</h2>
            <p className="text-white/60 text-lg mt-4 font-medium">Everything you need to digest material faster and perform better under pressure.</p>
          </motion.div>

          <motion.div 
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]"
          >
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div key={i} variants={fadeIn} className={`${feat.colSpan} h-full`}>
                  <div className="h-full rounded-3xl bg-white/[0.02] border border-white/10 p-8 flex flex-col relative overflow-hidden group hover:border-white/20 transition-colors">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-indigo/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary-indigo/10 transition-colors" />
                    
                    <div className="p-4 rounded-2xl bg-white/5 w-fit border border-white/10 mb-6 backdrop-blur-sm">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3 mt-auto">{feat.title}</h3>
                    <p className="text-white/60 leading-relaxed font-medium">{feat.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">From syllabus to A+ <br/>in 3 easy steps.</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: UploadCloud, title: "Upload Courseware", desc: "Drag & drop your files. We extract text, tables, and images to build your custom AI brain." },
              { step: "02", icon: Calendar, title: "Generate Study Plan", desc: "Specify subjects, exam dates, and daily hours. Get a step-by-step roadmap tailored to you." },
              { step: "03", icon: Target, title: "Practice & Refine", desc: "Chat with your AI tutor, generate mock exams, and target your weakest areas automatically." }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative"
              >
                <div className="text-8xl font-black text-white/[0.03] absolute -top-10 -left-4 select-none z-0">
                  {item.step}
                </div>
                <div className="relative z-10 pt-8">
                  <div className="w-12 h-12 rounded-full bg-primary-indigo/20 flex items-center justify-center border border-primary-indigo/30 mb-6">
                    <item.icon className="w-5 h-5 text-primary-indigo" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="max-w-7xl mx-auto px-6 py-24 relative z-10 bg-white/[0.01] border-y border-white/5">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-4xl font-black text-white tracking-tight">Loved by high achievers.</h2>
            <p className="text-white/60 mt-4 font-medium">Don't just take our word for it. Join thousands of students elevating their grades.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 flex flex-col gap-6"
              >
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, idx) => (
                    <Star key={idx} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-white/80 leading-relaxed font-medium text-lg flex-1">"{testimonial.text}"</p>
                <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-indigo to-primary-violet flex items-center justify-center font-bold text-white">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-xs text-white/50">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-6 py-24 relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-black text-white tracking-tight">Frequently Asked Questions</h2>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-4"
          >
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </section>

        {/* CTA Box */}
        <section className="max-w-5xl mx-auto px-6 py-12 z-10 relative">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="p-12 md:p-20 rounded-[2.5rem] bg-gradient-to-br from-primary-indigo/20 via-primary-violet/20 to-black border border-white/10 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20 mix-blend-overlay" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-primary-indigo/20 to-transparent blur-3xl -z-10" />
            
            <div className="relative z-10 flex flex-col items-center">
              <Zap className="w-12 h-12 text-white mb-6 animate-pulse" />
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Ready to ace your <br/> next exam?
              </h2>
              <p className="text-white/60 text-lg max-w-xl mx-auto mt-6 mb-10 font-medium">
                Join thousands of students who have stopped studying harder and started studying smarter. Create your first roadmap in seconds.
              </p>
              <Link href="/signup">
                <Button variant="primary" size="lg" className="font-black rounded-full px-10 h-14 text-lg hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                  Get Started For Free
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#030014] pt-16 pb-8 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-0 mb-12">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="shrink-0 relative w-7 h-7 rounded-lg bg-gradient-to-tr from-primary-indigo to-primary-violet p-0.5 shadow-md overflow-hidden">
                <img src="/logo.jpg" alt="StudyPilot Logo" className="w-full h-full rounded-[6px] object-cover" />
              </div>
              <span className="font-extrabold text-sm tracking-wider text-white">
                STUDYPILOT <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-indigo to-primary-violet">AI</span>
              </span>
            </Link>
            
            <div className="flex gap-6 text-sm font-medium text-white/50">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact Support</Link>
            </div>
          </div>
          <div className="text-center text-xs text-white/30 font-medium flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
            <p>&copy; {new Date().getFullYear()} StudyPilot AI. All rights reserved.</p>
            <p className="mt-2 md:mt-0 flex items-center gap-1">
              Built with <HeartIcon className="w-3 h-3 text-red-500" /> for peak performance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeartIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}
