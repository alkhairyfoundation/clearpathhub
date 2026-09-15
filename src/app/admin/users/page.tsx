'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import UserManagement from '@/components/admin/users/UserManagement';

export default function AdminUsersPage() {
  return (
    <DashboardLayout title="User Management" subtitle="Manage school users and permissions">
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      }>
        <UserManagement />
      </Suspense>
    </DashboardLayout>
  );
}