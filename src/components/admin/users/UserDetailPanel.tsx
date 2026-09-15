'use client';

import {
  X,
  Edit,
  Link2,
  Loader2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Users,
  GraduationCap,
  Briefcase,
  Info,
  Banknote,
  BadgeCheck,
  HeartPulse,
  Siren,
  BookOpen,
} from 'lucide-react';
import type { AdminUserDetail } from '@/lib/user-queries';
import {
  ROLE_CONFIG,
  formatDate,
  formatDateTime,
  formatCurrency,
} from './config';

interface UserDetailPanelProps {
  user: AdminUserDetail | null;
  loading: boolean;
  onClose: () => void;
  onEdit: (user: AdminUserDetail) => void;
  onLinkStudents: (user: AdminUserDetail) => void;
}

function Field({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}) {
  const missing = value === undefined || value === null || value === '' || value === '—';
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
      {icon && <span className="mt-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm mt-0.5 break-words ${missing ? 'italic text-slate-400 dark:text-slate-500' : 'font-medium text-slate-900 dark:text-white'}`}>
          {missing ? 'Not set' : value}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      {icon}
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
        {title}
      </h4>
      {count !== undefined && count > 0 && (
        <span className="text-xs font-semibold text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex-1 min-w-[100px] p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
      <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}

export default function UserDetailPanel({
  user,
  loading,
  onClose,
  onEdit,
  onLinkStudents,
}: UserDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-lg h-full overflow-y-auto slide-over-in shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Details</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {loading || !user ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-700">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl overflow-hidden ${!user.avatar_url ? 'bg-gradient-to-br from-primary-500 to-primary-600' : ''}`}>
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${user.first_name[0]?.toUpperCase() || ''}${user.last_name[0]?.toUpperCase() || ''}`
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                  {user.first_name} {user.last_name}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_CONFIG[user.role]?.bg} ${ROLE_CONFIG[user.role]?.color}`}>
                    {ROLE_CONFIG[user.role]?.icon}
                    {ROLE_CONFIG[user.role]?.label}
                  </span>
                  {(user.role === 'teacher' || user.role === 'accountant') && user.staff && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      user.staff.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {user.staff.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  )}
                  {user.role === 'student' && user.student?.admission_number && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      <BadgeCheck size={12} />
                      {user.student.admission_number}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contact & Account */}
            <SectionHeading icon={<Info size={15} className="text-primary-600 dark:text-primary-400" />} title="Contact & Account" />
            <div className="space-y-2">
              <Field icon={<Mail size={15} />} label="Email" value={user.email} />
              <Field icon={<Phone size={15} />} label="Phone" value={user.phone} />
              <Field label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
              <div className="grid grid-cols-2 gap-2">
                <Field icon={<Calendar size={15} />} label="Created" value={formatDateTime(user.created_at)} />
                <Field icon={<Calendar size={15} />} label="Last Updated" value={formatDateTime(user.updated_at)} />
              </div>
            </div>

            {/* Student academic + personal */}
            {user.role === 'student' && user.student && (
              <>
                <SectionHeading icon={<GraduationCap size={15} className="text-accent-600 dark:text-accent-400" />} title="Academic" />
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Class" value={user.student.class_name ? `${user.student.class_name} (Level ${user.student.class_level})` : null} />
                    <Field label="Admission No." value={user.student.admission_number} />
                  </div>
                  {user.stats && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {typeof user.stats.avg_score === 'number' && (
                        <Stat label="Avg Score" value={`${Math.round(user.stats.avg_score)}%`} sub={`${user.stats.result_count ?? 0} results`} />
                      )}
                      {user.stats.attendance && (
                        <Stat label="Attendance" value={user.stats.attendance.present} sub={`${user.stats.attendance.absent} absent`} />
                      )}
                      {typeof user.stats.homework_submissions === 'number' && (
                        <Stat label="HW Submitted" value={user.stats.homework_submissions} />
                      )}
                    </div>
                  )}
                </div>

                <SectionHeading icon={<Info size={15} className="text-accent-600 dark:text-accent-400" />} title="Personal" />
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Gender" value={user.student.gender ? user.student.gender[0].toUpperCase() + user.student.gender.slice(1) : null} />
                    <Field label="DOB" value={user.student.date_of_birth ? formatDate(user.student.date_of_birth) : null} />
                    <Field icon={<HeartPulse size={15} />} label="Blood Group" value={user.student.blood_group} />
                  </div>
                  <Field icon={<MapPin size={15} />} label="Address" value={user.student.address} />
                  <Field icon={<Siren size={15} />} label="Emergency Contact" value={user.student.emergency_contact} />
                </div>

                <SectionHeading icon={<Users size={15} className="text-secondary-600 dark:text-secondary-400" />} title="Guardian" />
                <div className="space-y-2">
                  <Field label="Guardian Name" value={user.student.guardian_name} />
                  <div className="grid grid-cols-2 gap-2">
                    <Field icon={<Phone size={15} />} label="Guardian Phone" value={user.student.guardian_phone} />
                    <Field icon={<Mail size={15} />} label="Guardian Email" value={user.student.guardian_email} />
                  </div>
                </div>
              </>
            )}

            {/* Staff info */}
            {(user.role === 'teacher' || user.role === 'accountant' || user.role === 'admin') && user.staff && (
              <>
                <SectionHeading icon={<Briefcase size={15} className="text-emerald-600 dark:text-emerald-400" />} title="Staff Information" />
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Staff ID" value={user.staff.staff_number} />
                    <Field label="Employee ID" value={user.staff.employee_id} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Department" value={user.staff.department_name} />
                    <Field label="Designation" value={user.staff.designation} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field icon={<Banknote size={15} />} label="Salary" value={user.staff.salary != null ? formatCurrency(user.staff.salary) : null} />
                    <Field icon={<Calendar size={15} />} label="Employed" value={user.staff.date_of_employment ? formatDate(user.staff.date_of_employment) : null} />
                  </div>
                </div>
                {user.role === 'teacher' && user.assigned_classes.length > 0 && (
                  <>
                    <SectionHeading icon={<BookOpen size={15} className="text-primary-600 dark:text-primary-400" />} title="Assigned Classes" count={user.assigned_classes.length} />
                    <div className="flex flex-wrap gap-2">
                      {user.assigned_classes.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                          <BookOpen size={12} />
                          {c.name} (Level {c.level})
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {user.role === 'teacher' && user.stats && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {typeof user.stats.subjects_count === 'number' && <Stat label="Subjects" value={user.stats.subjects_count} />}
                    {typeof user.stats.homework_count === 'number' && <Stat label="Homework" value={user.stats.homework_count} />}
                    {typeof user.stats.lessons_count === 'number' && <Stat label="Lessons" value={user.stats.lessons_count} />}
                    {typeof user.stats.sessions_count === 'number' && <Stat label="Sessions" value={user.stats.sessions_count} />}
                  </div>
                )}
              </>
            )}

            {/* Parent children */}
            {user.role === 'parent' && (
              <>
                <SectionHeading icon={<Users size={15} className="text-secondary-600 dark:text-secondary-400" />} title="Linked Children" count={user.linked_children.length} />
                {user.linked_children.length > 0 ? (
                  <div className="space-y-2">
                    {user.linked_children.map((c) => (
                      <div key={c.student_id} className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(c.first_name || '?')[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {c.admission_number || ''} {c.class_name ? `• ${c.class_name}` : ''}
                          </p>
                        </div>
                        {c.relationship && (
                          <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                            {c.relationship}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-400 dark:text-slate-500">No children linked yet</p>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => onEdit(user)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Edit size={16} /> Edit Details
              </button>
              {user.role === 'parent' && (
                <button onClick={() => onLinkStudents(user)} className="btn-accent flex-1 flex items-center justify-center gap-2">
                  <Link2 size={16} /> Link Students
                </button>
              )}
              <button onClick={onClose} className="btn-ghost">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}