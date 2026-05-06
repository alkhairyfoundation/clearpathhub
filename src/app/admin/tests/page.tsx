'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, FileText, BarChart3, Check } from 'lucide-react';

export default function AdminTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test', exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50
  });

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [testsRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*, subject:subjects(*), class:classes(*)').order('created_at', { ascending: false }),
      supabase.from('test_attempts').select('*, student:profiles(*), test:tests(*)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (testsRes.data) setTests(testsRes.data);
    if (attemptsRes.data) setAttempts(attemptsRes.data);
    setLoading(false);
  }

  async function handleCreateTest() {
    const { data: test } = await supabase.from('tests').insert({ ...formData, created_by: profile?.id, is_published: false }).select().single();
    if (test) {
      setTests([test, ...tests]);
      setShowTestModal(false);
    }
  }

  async function deleteTest(id: string) {
    if (confirm('Delete this test?')) {
      await supabase.from('tests').delete().eq('id', id);
      fetchData();
    }
  }

  const publishedTests = tests.filter((t: any) => t.is_published);
  const draftTests = tests.filter((t: any) => !t.is_published);
  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s: number, a: any) => s + a.score, 0) / attempts.length) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tests & Exams</h1>
          <p className="text-slate-500">Manage class tests and exams</p>
        </div>
        <button onClick={() => setShowTestModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={20} />Create Test
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Total Tests</span>
            <FileText size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{tests.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Published</span>
            <Check size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{publishedTests.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Draft</span>
            <Edit size={18} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{draftTests.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Avg Score</span>
            <BarChart3 size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{avgScore}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">All Tests</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : tests.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No tests yet</p>
        ) : (
          <div className="space-y-3">
            {tests.map((test: any) => (
              <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium text-slate-800">{test.title}</h3>
                  <p className="text-sm text-slate-500">{test.test_type} - {test.total_marks} marks</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${test.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {test.is_published ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => deleteTest(test.id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}