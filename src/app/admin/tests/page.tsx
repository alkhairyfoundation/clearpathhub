'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { ArrowLeft, Plus, Edit, Trash2, X, FileText, BarChart3, Check, Loader2, Search, Users, Clock, Eye, Send } from 'lucide-react';

export default function AdminTestsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test',
    exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50,
    shuffle_questions: false, shuffle_options: false, require_fullscreen: false,
    prevent_tab_switch: false, max_tab_switches: 3,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const [testsRes, attemptsRes, subjectsRes, classesRes] = await Promise.all([
      supabase.from('tests').select('*, subject:subjects!subject_id(name), class:classes!class_id(name)').order('created_at', { ascending: false }),
      supabase.from('test_attempts').select('*, student:profiles!student_id(first_name, last_name), test:tests!test_id(title)').order('created_at', { ascending: false }).limit(50),
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('classes').select('id, name').order('level'),
    ]);
    if (testsRes.data) setTests(testsRes.data);
    if (attemptsRes.data) setAttempts(attemptsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  }

  function openModal(test?: any) {
    if (test) {
      setEditingTest(test);
      setFormData({
        title: test.title, description: test.description || '', subject_id: test.subject_id || '', class_id: test.class_id || '',
        test_type: test.test_type, exam_date: test.exam_date || '', duration_minutes: test.duration_minutes || 30,
        total_marks: test.total_marks || 100, passing_score: test.passing_score || 50,
        shuffle_questions: test.shuffle_questions || false, shuffle_options: test.shuffle_options || false,
        require_fullscreen: test.require_fullscreen || false, prevent_tab_switch: test.prevent_tab_switch || false,
        max_tab_switches: test.max_tab_switches || 3,
      });
    } else {
      setEditingTest(null);
      setFormData({ title: '', description: '', subject_id: '', class_id: '', test_type: 'class_test',
        exam_date: '', duration_minutes: 30, total_marks: 100, passing_score: 50,
        shuffle_questions: false, shuffle_options: false, require_fullscreen: false,
        prevent_tab_switch: false, max_tab_switches: 3,
      });
    }
    setShowTestModal(true);
  }

  async function handleSave() {
    if (!formData.title.trim()) { setError('Title is required'); return; }
    setError(''); setSaving(true);
    try {
      if (editingTest) {
        const { error: err } = await supabase.from('tests').update(formData).eq('id', editingTest.id);
        if (err) throw new Error(err.message);
        setSuccess('Test updated');
      } else {
        const { error: err } = await supabase.from('tests').insert({ ...formData, created_by: profile?.id, is_published: false });
        if (err) throw new Error(err.message);
        setSuccess('Test created');
      }
      setTimeout(() => { setShowTestModal(false); fetchData(); }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save test');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(test: any) {
    try {
      const { error } = await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
      if (error) throw new Error(error.message);
    } catch (err: any) {
      setError(err.message);
    }
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test and all associated attempts?')) return;
    setDeleting(id);
    try {
      await supabase.from('test_attempts').delete().eq('test_id', id);
      const { error } = await supabase.from('tests').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Test deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = tests.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || t.test_type === filterType;
    return matchSearch && matchType;
  });

  const publishedTests = tests.filter(t => t.is_published);
  const draftTests = tests.filter(t => !t.is_published);
  const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s: number, a: any) => s + (a.score || 0), 0) / attempts.length) : 0;
  const totalAttempts = attempts.length;

  return (
    <DashboardLayout title="Tests & Exams" subtitle="Manage assessments and track student performance">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft size={20} className="text-slate-600" /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">Tests & Exams</h1>
            <p className="text-slate-500 mt-1">Manage assessments and track student performance</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><Plus size={18} />Create Test</button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Total Tests</span><FileText size={16} className="text-primary-600" /></div><p className="text-2xl font-bold text-slate-900">{tests.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Published</span><Check size={16} className="text-green-600" /></div><p className="text-2xl font-bold text-green-600">{publishedTests.length}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Attempts</span><Users size={16} className="text-purple-600" /></div><p className="text-2xl font-bold text-purple-600">{totalAttempts}</p></div>
        <div className="card"><div className="flex items-center justify-between mb-1"><span className="text-xs text-slate-500 uppercase">Avg Score</span><BarChart3 size={16} className="text-amber-600" /></div><p className="text-2xl font-bold text-amber-600">{avgScore}%</p></div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="Search tests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input pl-10" /></div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-auto">
            <option value="all">All Types</option>
            <option value="class_test">Class Test</option>
            <option value="mid_term">Mid Term</option>
            <option value="exam">Exam</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16"><FileText className="mx-auto text-slate-300 mb-4" size={48} /><p className="font-medium text-slate-500">{tests.length === 0 ? 'No tests created yet' : 'No tests match your filters'}</p></div>
        ) : (
          <div className="space-y-3">
            {filtered.map(test => (
              <div key={test.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><FileText size={20} className="text-primary-600" /></div>
                  <div>
                    <p className="font-semibold text-slate-900">{test.title}</p>
                    <p className="text-sm text-slate-500">{test.subject?.name || 'No Subject'} • {test.class?.name || 'No Class'} • {test.test_type.replace('_', ' ')} • {test.total_marks} marks</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${test.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{test.is_published ? 'Published' : 'Draft'}</span>
                  {test.exam_date && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} />{new Date(test.exam_date).toLocaleDateString()}</span>}
                  <button onClick={() => togglePublish(test)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600" title={test.is_published ? 'Unpublish' : 'Publish'}><Send size={15} /></button>
                  <button onClick={() => openModal(test)} className="p-1.5 hover:bg-primary-50 rounded-lg"><Edit size={15} className="text-primary-600" /></button>
                  <button onClick={() => handleDelete(test.id)} disabled={deleting === test.id} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-50">{deleting === test.id ? <Loader2 size={15} className="text-red-600 animate-spin" /> : <Trash2 size={15} className="text-red-600" />}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {attempts.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Users size={18} className="text-slate-400" />Recent Attempts</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Student</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Test</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Score</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Date</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{attempts.slice(0, 10).map(a => (<tr key={a.id} className="hover:bg-slate-50"><td className="py-3 px-4 font-medium text-slate-900">{a.student?.first_name} {a.student?.last_name}</td><td className="py-3 px-4 text-sm text-slate-600 hidden sm:table-cell">{a.test?.title}</td><td className="py-3 px-4"><span className={`font-semibold ${a.score >= 50 ? 'text-green-600' : 'text-red-600'}`}>{a.score}%</span></td><td className="py-3 px-4 text-sm text-slate-500 hidden md:table-cell">{new Date(a.created_at).toLocaleDateString()}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-scale-in">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">{editingTest ? 'Edit Test' : 'Create Test'}</h3><button onClick={() => setShowTestModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={20} className="text-slate-500" /></button></div>
            <div className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div><label className="label">Title</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="e.g., Mathematics Mid-Term" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Subject</label><select value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} className="input"><option value="">Select</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div><div><label className="label">Class</label><select value={formData.class_id} onChange={(e) => setFormData({ ...formData, class_id: e.target.value })} className="input"><option value="">Select</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="label">Type</label><select value={formData.test_type} onChange={(e) => setFormData({ ...formData, test_type: e.target.value })} className="input"><option value="class_test">Class Test</option><option value="mid_term">Mid Term</option><option value="exam">Exam</option><option value="quiz">Quiz</option></select></div><div><label className="label">Date</label><input type="date" value={formData.exam_date} onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })} className="input" /></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="label">Duration (min)</label><input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Total Marks</label><input type="number" value={formData.total_marks} onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })} className="input" /></div><div><label className="label">Pass %</label><input type="number" value={formData.passing_score} onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })} className="input" /></div></div>
              <div><label className="label">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={2} /></div>
              <div className="border-t pt-4">
                <h4 className="font-semibold text-slate-800 mb-3 text-sm">Security Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_questions} onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Shuffle Questions</p><p className="text-xs text-slate-400">Display questions in random order for each student</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.shuffle_options} onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Shuffle Options</p><p className="text-xs text-slate-400">Randomize answer option order for each student</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.require_fullscreen} onChange={(e) => setFormData({ ...formData, require_fullscreen: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Require Fullscreen</p><p className="text-xs text-slate-400">Force fullscreen mode during the exam</p></div></label>
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.prevent_tab_switch} onChange={(e) => setFormData({ ...formData, prevent_tab_switch: e.target.checked })} className="w-4 h-4" /><div><p className="text-sm font-medium text-slate-700">Prevent Tab Switching</p><p className="text-xs text-slate-400">Auto-submit test if student switches tabs too many times</p></div></label>
                  {formData.prevent_tab_switch && <div><label className="label text-xs">Max Allowed Tab Switches</label><input type="number" value={formData.max_tab_switches} onChange={(e) => setFormData({ ...formData, max_tab_switches: parseInt(e.target.value) })} className="input" min={1} max={10} /></div>}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200"><button onClick={() => setShowTestModal(false)} className="btn-ghost">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : editingTest ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
