'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Loader2, ArrowLeft, Target } from 'lucide-react';
import type { Archetype } from '@/types';
import DashboardLayout from '@/components/DashboardLayout';

export default function AdminArchetypesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Archetype | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', icon_key: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') { router.push('/login'); return; }
    fetchArchetypes();
  }, [profile]);

  async function fetchArchetypes() {
    setLoading(true);
    const { data, error } = await supabase.from('archetypes').select('*').order('name');
    if (!error && data) setArchetypes(data);
    setLoading(false);
  }

  function openModal(item?: Archetype) {
    if (item) {
      setEditing(item);
      setFormData({ name: item.name, description: item.description, icon_key: item.icon_key });
    } else {
      setEditing(null);
      setFormData({ name: '', description: '', icon_key: 'user' });
    }
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) { setError('Name is required'); return; }
    if (!formData.description.trim()) { setError('Description is required'); return; }
    if (!formData.icon_key.trim()) { setError('Icon key is required'); return; }
    setError(''); setSaving(true);
    try {
      if (editing) {
        const { error: err } = await supabase.from('archetypes').update(formData).eq('id', editing.id);
        if (err) throw new Error(err.message);
        setSuccess('Archetype updated');
      } else {
        const { error: err } = await supabase.from('archetypes').insert(formData);
        if (err) throw new Error(err.message);
        setSuccess('Archetype created');
      }
      setTimeout(() => { setShowModal(false); fetchArchetypes(); }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  }

  async function handleToggleActive(item: Archetype) {
    const { error } = await supabase.from('archetypes').update({ is_active: !item.is_active }).eq('id', item.id);
    if (!error) fetchArchetypes();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this archetype?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('archetypes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setSuccess('Archetype deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    } finally { setDeleting(null); }
  }

  const ICON_OPTIONS = [
    'book-open', 'users', 'lightbulb', 'message-square', 'bar-chart-3',
    'palette', 'heart', 'compass', 'star', 'zap', 'shield', 'globe',
    'target', 'award', 'crown', 'rocket', 'sun', 'moon',
  ];

  return (
    <DashboardLayout title="Archetypes" subtitle="Manage student identity cards">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
              <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white dark:text-white">Archetypes</h1>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Identity cards students choose from each term</p>
            </div>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Add Archetype
          </button>
        </div>

        {success && <div className="bg-emerald-50 dark:bg-emerald-900/20 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40 dark:border-emerald-900/40 rounded-lg p-3 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300 text-sm">{success}</div>}
        {error && <div className="bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 dark:border-red-900/40 rounded-lg p-3 text-red-700 dark:text-red-400 dark:text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : archetypes.length === 0 ? (
          <div className="card text-center py-16">
            <Target className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400">No archetypes yet</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 dark:text-slate-500 mt-1 mb-4">Create identity cards for students to choose from</p>
            <button onClick={() => openModal()} className="btn-primary">Create Archetype</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archetypes.map((item) => (
              <div key={item.id} className={`card relative ${!item.is_active ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                    <Target className="text-primary-600 dark:text-primary-400 dark:text-primary-400" size={24} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openModal(item)} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg">
                      <Edit size={16} className="text-slate-400 dark:text-slate-500 dark:text-slate-500" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id} className="p-1.5 hover:bg-red-50 dark:bg-red-900/20 dark:bg-red-900/20 rounded-lg">
                      {deleting === item.id ? <Loader2 size={16} className="animate-spin text-red-500 dark:text-red-400 dark:text-red-400" /> : <Trash2 size={16} className="text-red-400" />}
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">{item.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 dark:border-slate-700">
                  <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-500">icon: {item.icon_key}</span>
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${item.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-400'}`}
                  >
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
              <h3 className="text-lg font-bold">{editing ? 'Edit Archetype' : 'Create Archetype'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:bg-slate-700 dark:bg-slate-700 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g., The Scholar" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Student-friendly description of this identity" />
              </div>
              <div>
                <label className="label">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} onClick={() => setFormData({ ...formData, icon_key: icon })}
                      className={`p-2 rounded-lg border text-center text-xs ${formData.icon_key === icon ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:border-slate-300 dark:border-slate-600 dark:border-slate-600'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
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
