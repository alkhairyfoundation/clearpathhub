'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, Award, UserCheck, DollarSign, Bell, Plus } from 'lucide-react';

export default function ParentChildrenPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') { router.push('/login'); return; }
    fetchData();
  }, [profile]);

  async function fetchData() {
    setLoading(true);
    // In real app, link children to parent via students table
    const { data } = await supabase.from('students').select('*, profile:profiles(*), class:classes(*)').limit(5);
    if (data) setChildren(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800">My Children</h1><p className="text-slate-500">View your children&apos;s information</p></div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div> : children.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center"><Users className="mx-auto text-gray-400 mb-4" size={48} /><p className="text-slate-500">No children linked to your account</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">{child.profile?.first_name?.[0]}{child.profile?.last_name?.[0]}</div>
                <div><h3 className="font-semibold text-slate-800 text-lg">{child.profile?.first_name} {child.profile?.last_name}</h3><p className="text-sm text-slate-500">{child.admission_number} • {child.class?.name}</p></div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg"><Award className="mx-auto text-blue-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">85%</p><p className="text-xs text-slate-500">Average</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-lg"><UserCheck className="mx-auto text-green-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">92%</p><p className="text-xs text-slate-500">Attendance</p></div>
                <div className="text-center p-3 bg-gray-50 rounded-lg"><DollarSign className="mx-auto text-orange-600 mb-1" size={18} /><p className="text-lg font-bold text-slate-800">Paid</p><p className="text-xs text-slate-500">Fees</p></div>
              </div>
              
              <div className="flex gap-2">
                <a href={`/parent/progress?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Progress</a>
                <a href={`/parent/behavior?child=${child.id}`} className="flex-1 btn-outline text-center py-2">Behavior</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}