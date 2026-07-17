'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ArrowLeft, BookOpen, CheckCircle, Lock, Target, Brain,
  Trophy, Star, Award, Zap, Loader2, ChevronRight, Flag
} from 'lucide-react';
import { getMasteryColor } from '@/lib/colors';

interface MapNode {
  id: string;
  label: string;
  type: 'subject' | 'topic' | 'milestone' | 'achievement';
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  score?: number;
  subjectId?: string;
  topic?: string;
  href?: string;
}

export default function GrowthMapPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.role !== 'student') { router.push('/login'); return; }
    buildMap();
  }, [profile]);

  async function buildMap() {
    setLoading(true);
    try {
      const { data: student } = await supabase.from('students').select('class_id').eq('profile_id', profile?.id).maybeSingle();
      const [subjRes, pathRes, scoreRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('class_id', student?.class_id),
        fetch(`/api/mastery/path?studentId=${profile?.id}`).then(r => r.json()),
        fetch(`/api/mastery/scores?studentId=${profile?.id}`).then(r => r.json()),
      ]);

      const mapNodes: MapNode[] = [];
      const subjects = subjRes.data || [];
      const paths = (pathRes.path || []) as any[];
      const scores = (scoreRes.scores || []) as any[];

      subjects.forEach((subj, si) => {
        mapNodes.push({
          id: `subject-${subj.id}`,
          label: subj.name,
          type: 'subject',
          status: 'completed',
          subjectId: subj.id,
          href: `/student/learning-path/${subj.id}`,
        });

        const subjPaths = paths.filter(p => p.subject_id === subj.id);
        const subjTopics = [...new Set(subjPaths.map(p => p.topic))];
        const completedTopics = [...new Set(subjPaths.filter(p => p.stage === 'advancement' && p.is_completed).map(p => p.topic))];

        subjTopics.slice(0, 5).forEach((topic, ti) => {
          const topicScore = scores.find(s => s.subject_id === subj.id && s.topic === topic);
          const isCompleted = completedTopics.includes(topic);
          const isUnlocked = subjPaths.some(p => p.topic === topic && p.is_unlocked);
          mapNodes.push({
            id: `topic-${subj.id}-${topic}`,
            label: topic.length > 25 ? topic.slice(0, 25) + '...' : topic,
            type: 'topic',
            status: isCompleted ? 'completed' : isUnlocked ? 'unlocked' : 'locked',
            score: topicScore?.mastery_score,
            subjectId: subj.id,
            topic,
            href: `/student/learning-path/${subj.id}/${encodeURIComponent(topic)}`,
          });
        });

        if (si < subjects.length - 1) {
          const allCompleted = subjTopics.length > 0 && subjTopics.every(t => completedTopics.includes(t));
          mapNodes.push({
            id: `milestone-${subj.id}`,
            label: `${subj.name} Complete!`,
            type: 'milestone',
            status: allCompleted ? 'completed' : 'locked',
          });
        }
      });

      setNodes(mapNodes);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const typeIcons: Record<string, React.ReactNode> = {
    subject: <BookOpen size={18} />,
    topic: <Target size={16} />,
    milestone: <Flag size={18} />,
    achievement: <Trophy size={18} />,
  };

  const typeColors: Record<string, string> = {
    subject: 'border-l-blue-500',
    topic: 'border-l-amber-500',
    milestone: 'border-l-emerald-500',
    achievement: 'border-l-purple-500',
  };

  if (loading) {
    return (
      <DashboardLayout title="Growth Map" subtitle="Your learning journey visualized">
        <div className="flex items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600 dark:text-primary-400 dark:text-primary-400" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Growth Map" subtitle="Your learning journey visualized">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/student" className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Growth Map</h1>
            <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Your progression through subjects and topics</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            { status: 'completed', icon: <CheckCircle size={14} className="text-emerald-500" />, label: 'Completed' },
            { status: 'unlocked', icon: <Target size={14} className="text-amber-500 dark:text-amber-400 dark:text-amber-400" />, label: 'In Progress' },
            { status: 'locked', icon: <Lock size={14} className="text-slate-300" />, label: 'Locked' },
            { status: 'milestone', icon: <Flag size={14} className="text-emerald-600 dark:text-emerald-400 dark:text-emerald-400" />, label: 'Milestone' },
          ].map(item => (
            <div key={item.status} className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 rounded-lg">
              {item.icon}
              <span className="text-slate-600 dark:text-slate-400 dark:text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        {nodes.length === 0 ? (
          <div className="card text-center py-16">
            <Brain className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No learning data yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1">Start practicing to build your growth map</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nodes.map((node) => {
              const isActive = selectedNode?.id === node.id;
              const color = node.score != null ? getMasteryColor(node.score) : null;

              return (
                <div key={node.id}>
                  {node.href ? (
                    <Link href={node.href} onClick={() => setSelectedNode(node)}
                      className={`block p-4 rounded-xl border-2 transition-all ${
                        isActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 shadow-md' :
                        node.status === 'completed' ? 'border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 hover:border-emerald-400' :
                        node.status === 'unlocked' ? 'border-amber-200 dark:border-amber-900/40 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 dark:bg-amber-900/20 hover:border-amber-400' :
                        'border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800 opacity-60'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' :
                          node.status === 'unlocked' ? 'bg-amber-100 dark:bg-amber-900/30 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 dark:text-amber-400' :
                          'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-500'
                        }`}>
                          {node.status === 'completed' ? <CheckCircle size={18} /> : 
                           node.status === 'unlocked' ? typeIcons[node.type] :
                           <Lock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${
                            node.status === 'completed' ? 'text-emerald-800 dark:text-emerald-200 dark:text-emerald-200' :
                            node.status === 'unlocked' ? 'text-amber-800' :
                            'text-slate-500 dark:text-slate-400 dark:text-slate-400'
                          }`}>{node.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500 capitalize mt-0.5">{node.type}</p>
                        </div>
                        {color && (
                          <span className={`text-xs font-bold ${color.textColor}`}>{Math.round(node.score!)}%</span>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className={`p-4 rounded-xl border-2 ${
                      node.status === 'completed' ? 'border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:bg-slate-800'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          node.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-400 dark:text-slate-500 dark:text-slate-500'
                        }`}>
                          {typeIcons[node.type]}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-200 dark:text-slate-200">{node.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-500">{node.type}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary stats */}
        <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Award size={18} /> Your Learning Journey</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-primary-100 text-xs">Total Nodes</p><p className="text-xl font-bold">{nodes.length}</p></div>
            <div><p className="text-primary-100 text-xs">Completed</p><p className="text-xl font-bold">{nodes.filter(n => n.status === 'completed').length}</p></div>
            <div><p className="text-primary-100 text-xs">In Progress</p><p className="text-xl font-bold">{nodes.filter(n => n.status === 'unlocked').length}</p></div>
            <div><p className="text-primary-100 text-xs">Locked</p><p className="text-xl font-bold">{nodes.filter(n => n.status === 'locked').length}</p></div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
