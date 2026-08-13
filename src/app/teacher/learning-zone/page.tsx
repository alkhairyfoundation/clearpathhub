'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import LearningZoneMonitor from '@/components/LearningZoneMonitor';

export default function TeacherLearningZonePage() {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profile || profile.role !== 'teacher') { router.push('/login'); return; }
  }, [profile, router]);

  return (
    <DashboardLayout
      title="Learning Zone"
      subtitle="Live view of students studying right now"
    >
      <LearningZoneMonitor role="teacher" />
    </DashboardLayout>
  );
}
