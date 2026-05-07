'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { FileText, Download, Eye, Paperclip } from 'lucide-react';

export default function StudentLessonsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  useEffect(() => {
    if (!profile || profile.role !== 'student') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('lessons').select('*, subject:subjects(*)').eq('is_published', true).order('created_at', { ascending: false });
    if (data) setLessons(data);
    setLoading(false);
  }

  return (
    <DashboardLayout title="Lesson Notes" subtitle="Download and view lesson materials">
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-slate-800">Lesson Notes</h1><p className="text-slate-500">Download and view lesson materials</p></div>
        
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.length === 0 ? <div className="col-span-full bg-white rounded-xl p-12 text-center"><FileText className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No lessons available</p></div> :
          lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText className="text-emerald-600" size={24} /></div>
                <button onClick={() => setSelectedLesson(lesson)} className="p-2 hover:bg-gray-100 rounded-lg"><Eye size={16} className="text-slate-600" /></button>
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{lesson.title}</h3>
              <p className="text-sm text-slate-500 mb-3">{lesson.subject?.name}</p>
              <p className="text-sm text-slate-600 line-clamp-3 mb-4">{lesson.content}</p>
              {lesson.attachments && lesson.attachments.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Paperclip size={14} /><span>{lesson.attachments.length} attachment(s)</span></div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLesson(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white"><h2 className="text-xl font-semibold text-slate-800">{selectedLesson.title}</h2><p className="text-sm text-slate-500">{selectedLesson.subject?.name}</p></div>
            <div className="p-6"><div className="prose max-w-none">{selectedLesson.content}</div></div>
            {selectedLesson.attachments && selectedLesson.attachments.length > 0 && (
              <div className="p-6 border-t"><h3 className="font-medium text-slate-800 mb-3">Attachments</h3><div className="space-y-2">{selectedLesson.attachments.map((url: string, i: number) => (<a key={i} href={url} target="_blank" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"><Download size={16} /><span>{url.split('/').pop()}</span></a>))}</div></div>
            )}
          </div>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}