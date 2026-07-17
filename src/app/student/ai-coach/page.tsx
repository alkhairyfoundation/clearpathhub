'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, Send, Bot, User, Sparkles, Brain,
  Target, BookOpen, TrendingUp, Clock, Star, Loader2,
  AlertCircle, CheckCircle
} from 'lucide-react';

interface Message {
  role: 'ai' | 'user';
  text: string;
  recommendations?: any[];
}

interface CoachData {
  response: string;
  recommendations: any[];
  history: any[];
  student: { name: string; className: string };
  weakTopics: any[];
  streak: any;
  recentSessions: any[];
}

const QUICK_ACTIONS = [
  { type: 'motivation', label: 'Give me motivation!', icon: <Sparkles size={16} /> },
  { type: 'gap_analysis', label: 'Analyze my gaps', icon: <Target size={16} /> },
  { type: 'revision_plan', label: 'Create revision plan', icon: <BookOpen size={16} /> },
  { type: 'goal_suggestion', label: 'Suggest goals', icon: <TrendingUp size={16} /> },
];

export default function AICoachPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    initializeCoach();
  }, [profile]);

  async function initializeCoach() {
    setInitialLoading(true);
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: profile?.id, interaction_type: 'welcome' }),
      });
      const data: CoachData = await res.json();

      setCoachData(data);
      setMessages([{
        role: 'ai',
        text: data.response,
        recommendations: data.recommendations,
      }]);
    } catch (err) {
      setMessages([{ role: 'ai', text: 'Assalamu Alaikum! I\'m your AI Learning Coach. I\'m here to help you on your learning journey. What would you like to explore today?' }]);
    }
    setInitialLoading(false);
  }

  async function sendMessage(type: string, prompt?: string) {
    const userText = prompt || QUICK_ACTIONS.find(a => a.type === type)?.label || input;
    if (!userText.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: profile?.id,
          interaction_type: type,
          prompt: userText,
          context: {
            recentMessages: messages.slice(-4).map(m => ({ role: m.role, text: m.text })),
          },
        }),
      });
      const data: CoachData = await res.json();

      setCoachData(data);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.response,
        recommendations: data.recommendations,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setLoading(false);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (initialLoading) {
    return (
      <DashboardLayout title="AI Coach" subtitle="Your personal learning assistant">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="AI Coach" subtitle="Your personal learning assistant">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Bot size={20} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white dark:text-white">AI Learning Coach</h1>
              {coachData?.student && (
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Supporting {coachData.student.name} • {coachData.student.className}</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {coachData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {coachData.streak && (
              <div className="card py-2 px-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Streak</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 dark:text-amber-400">{coachData.streak.current_streak} days</p>
              </div>
            )}
            {coachData.weakTopics && coachData.weakTopics.length > 0 && (
              <div className="card py-2 px-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Weak Areas</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 dark:text-red-400">{coachData.weakTopics.length}</p>
              </div>
            )}
            {coachData.recentSessions && (
              <div className="card py-2 px-3 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Recent Avg</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 dark:text-emerald-400">
                  {coachData.recentSessions.length > 0
                    ? Math.round(coachData.recentSessions.reduce((s: number, r: any) => s + (r.score || 0), 0) / coachData.recentSessions.length) + '%'
                    : 'N/A'}
                </p>
              </div>
            )}
            <div className="card py-2 px-3 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">Interactions</p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 dark:text-primary-400">{coachData.history?.length || 0}</p>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="card p-4 max-h-[500px] overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'ai' ? 'bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700'
              }`}>
                {msg.role === 'ai' ? <Bot size={16} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" /> : <User size={16} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />}
              </div>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`p-3 rounded-xl text-sm ${
                  msg.role === 'ai'
                    ? 'bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 text-slate-800 dark:text-slate-200 dark:text-slate-200 border border-slate-200 dark:border-slate-700 dark:border-slate-700'
                    : 'bg-primary-600 text-white'
                }`}>
                  <div className="whitespace-pre-line">{msg.text}</div>
                </div>
                {msg.recommendations && msg.recommendations.length > 0 && msg.role === 'ai' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.recommendations.map((rec: any, ri: number) => (
                      <button
                        key={ri}
                        onClick={() => sendMessage(rec.type, rec.text)}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium border transition-colors ${
                          rec.priority === 'critical'
                            ? 'bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 text-red-700 dark:text-red-400 dark:text-red-400 border-red-200 dark:border-red-900/40 dark:border-red-900/40 hover:bg-red-100 dark:bg-red-900/30 dark:bg-red-900/30'
                            : rec.priority === 'high'
                              ? 'bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 dark:text-amber-300 border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 hover:bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30'
                              : 'bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 dark:text-blue-300 border-blue-200 dark:border-blue-900/40 dark:border-blue-900/40 hover:bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30'
                        }`}
                      >
                        {rec.text.length > 40 ? rec.text.slice(0, 40) + '...' : rec.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 dark:bg-primary-900/30 flex items-center justify-center">
                <Bot size={16} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.type}
              onClick={() => sendMessage(action.type)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600 transition-all disabled:opacity-50"
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage('general', input)}
            placeholder="Ask your AI coach anything..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage('general', input)}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        {/* Coach Info */}
        <div className="card bg-gradient-to-r from-primary-50 to-amber-50 border border-primary-200 dark:border-primary-900/40 dark:border-primary-900/40">
          <h3 className="font-bold text-slate-900 dark:text-white dark:text-white mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600 dark:text-primary-400 dark:text-primary-400" />
            About Your AI Coach
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-400">
            <div className="flex items-start gap-2">
              <Brain size={14} className="text-primary-500 mt-0.5" />
              <span>Analyzes your strengths and weaknesses from practice data</span>
            </div>
            <div className="flex items-start gap-2">
              <Target size={14} className="text-amber-500 dark:text-amber-400 dark:text-amber-400 mt-0.5" />
              <span>Suggests personalized goals and next steps</span>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen size={14} className="text-emerald-500 mt-0.5" />
              <span>Creates custom revision plans for weak topics</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp size={14} className="text-purple-500 dark:text-purple-400 dark:text-purple-400 mt-0.5" />
              <span>Predicts future challenges and recommends intervention</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
