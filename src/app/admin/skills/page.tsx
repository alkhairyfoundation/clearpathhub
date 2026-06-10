'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Loader2, ArrowLeft, Brain } from 'lucide-react';
import type { Skill } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminSkillsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', category: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchSkills();
  }, [profile]);

  async function fetchSkills() {
    setLoading(true);
    const { data, error } = await supabase.from('skills').select('*').order('name');
    if (!error && data) setSkills(data);
    setLoading(false);
  }

  function openModal(item?: Skill) {
    if (item) {
      setEditing(item);
      setFormData({ name: item.name, category: item.category || '', description: item.description });
    } else {
      setEditing(null);
      setFormData({ name: '', category: 'Cognitive', description: '' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) { setError('Name is required'); return; }
    if (!formData.description.trim()) { setError('Description is required'); return; }
    setError(''); setSaving(true);
    try {
      const payload = { ...formData, category: formData.category || null };
      if (editing) {
        const { error: err } = await supabase.from('skills').update(payload).eq('id', editing.id);
        if (err) throw new Error(err.message);
        setSuccess('Skill updated');
      } else {
        const { error: err } = await supabase.from('skills').insert(payload);
        if (err) throw new Error(err.message);
        setSuccess('Skill created');
      }
      setTimeout(() => { setShowModal(false); fetchSkills(); }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function handleToggleActive(item: Skill) {
    const { error } = await supabase.from('skills').update({ is_active: !item.is_active }).eq('id', item.id);
    if (!error) fetchSkills();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this skill?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('skills').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Skill deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally { setDeleting(null); }
  }

  const categories = ['Cognitive', 'Social', 'Personal', 'Technical'];
  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Skills Bank" subtitle="Manage the skills students can select for their growth plan">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Skills Bank</h1>
              <p className="text-slate-500 mt-1">Define skills students can select for their growth journey</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Skill
          </button>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-700 text-sm">{success}</div>}
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search skills..." className="input max-w-md" />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="card text-center py-16">
            <Brain className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500">No skills found</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">{searchQuery ? 'Try a different search' : 'Create your first skill'}</p>
            {!searchQuery && <button onClick={() => openModal()} className="btn-primary">Create Skill</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((item) => (
              <div key={item.id} className={`card relative ${!item.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    {item.category && <span className="badge badge-primary text-xs">{item.category}</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openModal(item)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <Edit size={16} className="text-slate-400" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="p-1.5 hover:bg-red-50 rounded-lg">
                      {deleting === item.id ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} className="text-red-400" />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => handleToggleActive(item)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-lg font-bold">{editing ? 'Edit Skill' : 'Create Skill'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., Critical Thinking" />
              </div>
              <div>
                <label className="label">Category</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Student-friendly description of this skill" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
