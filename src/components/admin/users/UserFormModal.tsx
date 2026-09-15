'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Upload, UserPlus } from 'lucide-react';
import { uploadFile } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import type { AdminUserDetail } from '@/lib/user-queries';
import type { UserRole } from '@/types';
import { ROLE_CONFIG, GENDER_OPTIONS, BLOOD_GROUP_OPTIONS } from './config';

export interface ClassOption {
  id: string;
  name: string;
  level: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface UserFormModalProps {
  open: boolean;
  editingUser: AdminUserDetail | null;
  classes: ClassOption[];
  departments: DepartmentOption[];
  onClose: () => void;
  onSaved: (message: string, credentials?: { email: string; password: string }) => void;
  onFailed: (error: string) => void;
}

interface FormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  phone: string;
  class_id: string;
  avatar_url: string;
}

interface StudentState {
  date_of_birth: string;
  gender: string;
  address: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  blood_group: string;
  emergency_contact: string;
  admission_number: string;
}

interface StaffState {
  staff_id: string;
  employee_id: string;
  department_id: string;
  designation: string;
  salary: string;
  date_of_employment: string;
  status: 'active' | 'inactive';
}

const emptyForm: FormState = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  role: 'teacher',
  phone: '',
  class_id: '',
  avatar_url: '',
};

const emptyStudent: StudentState = {
  date_of_birth: '',
  gender: '',
  address: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_email: '',
  blood_group: '',
  emergency_contact: '',
  admission_number: '',
};

const emptyStaff: StaffState = {
  staff_id: '',
  employee_id: '',
  department_id: '',
  designation: '',
  salary: '',
  date_of_employment: '',
  status: 'active',
};

export default function UserFormModal({
  open,
  editingUser,
  classes,
  departments,
  onClose,
  onSaved,
  onFailed,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [studentData, setStudentData] = useState<StudentState>(emptyStudent);
  const [staffData, setStaffData] = useState<StaffState>(emptyStaff);
  const [teacherClassIds, setTeacherClassIds] = useState<string[]>([]);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setResetPasswordMode(false);
    setTeacherClassIds([]);

    if (editingUser) {
      setFormData({
        email: editingUser.email,
        password: '',
        first_name: editingUser.first_name,
        last_name: editingUser.last_name,
        role: editingUser.role,
        phone: editingUser.phone || '',
        class_id: editingUser.student?.class_id || '',
        avatar_url: editingUser.avatar_url || '',
      });
      setStudentData({
        date_of_birth: editingUser.student?.date_of_birth || '',
        gender: editingUser.student?.gender || '',
        address: editingUser.student?.address || '',
        guardian_name: editingUser.student?.guardian_name || '',
        guardian_phone: editingUser.student?.guardian_phone || '',
        guardian_email: editingUser.student?.guardian_email || '',
        blood_group: editingUser.student?.blood_group || '',
        emergency_contact: editingUser.student?.emergency_contact || '',
        admission_number: editingUser.student?.admission_number || '',
      });
      setStaffData({
        staff_id: editingUser.staff?.staff_number || '',
        employee_id: editingUser.staff?.employee_id || '',
        department_id: editingUser.staff?.department_id || '',
        designation: editingUser.staff?.designation || '',
        salary: editingUser.staff?.salary != null ? String(editingUser.staff.salary) : '',
        date_of_employment: editingUser.staff?.date_of_employment || '',
        status: editingUser.staff?.status || 'active',
      });
      setTeacherClassIds(editingUser.assigned_classes.map((c) => c.id));
    } else {
      setFormData({ ...emptyForm });
      setStudentData({ ...emptyStudent });
      setStaffData({ ...emptyStaff });
    }
  }, [open, editingUser]);

  if (!open) return null;

  const isEdit = !!editingUser;

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
      const { url, error: upError } = await uploadFile('avatars', compressed, 'admin-upload');
      if (upError) throw upError;
      if (url) setFormData((prev) => ({ ...prev, avatar_url: url }));
    } catch (err: any) {
      setError(err.message || 'Avatar upload failed');
    }
    setUploadingAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  }

  const needsStudent = formData.role === 'student';
  const needsStaff = formData.role === 'teacher' || formData.role === 'accountant' || formData.role === 'admin';
  const needsClasses = formData.role === 'teacher';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isEdit && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const body: Record<string, any> = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          phone: formData.phone || null,
          avatar_url: formData.avatar_url || null,
        };
        if (resetPasswordMode && formData.password) {
          body.password = formData.password;
        }
        if (needsClasses) {
          body.teacher_class_ids = teacherClassIds;
        }
        if (needsStudent) {
          body.class_id = formData.class_id || null;
          body.date_of_birth = studentData.date_of_birth || null;
          body.gender = studentData.gender || null;
          body.address = studentData.address || null;
          body.guardian_name = studentData.guardian_name || null;
          body.guardian_phone = studentData.guardian_phone || null;
          body.guardian_email = studentData.guardian_email || null;
          body.blood_group = studentData.blood_group || null;
          body.emergency_contact = studentData.emergency_contact || null;
          body.admission_number = studentData.admission_number || '';
        }
        if (needsStaff) {
          body.staff_id = staffData.staff_id || undefined;
          body.employee_id = staffData.employee_id || undefined;
          body.department_id = staffData.department_id || null;
          body.designation = staffData.designation || null;
          body.salary = staffData.salary !== '' ? Number(staffData.salary) : null;
          body.date_of_employment = staffData.date_of_employment || null;
          body.status = staffData.status;
        }

        const res = await fetch(`/api/admin/users/${editingUser!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to update user');
        onSaved(result.message || 'User updated successfully');
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role: formData.role,
            phone: formData.phone || null,
            avatar_url: formData.avatar_url || null,
            teacher_class_ids: needsClasses ? teacherClassIds : undefined,
            ...(needsStudent
              ? {
                  class_id: formData.class_id || null,
                  date_of_birth: studentData.date_of_birth || null,
                  gender: studentData.gender || null,
                  address: studentData.address || null,
                  guardian_name: studentData.guardian_name || null,
                  guardian_phone: studentData.guardian_phone || null,
                  guardian_email: studentData.guardian_email || null,
                  blood_group: studentData.blood_group || null,
                  emergency_contact: studentData.emergency_contact || null,
                  admission_number: studentData.admission_number || undefined,
                }
              : {}),
            ...(needsStaff
              ? {
                  staff_id: staffData.staff_id || undefined,
                  employee_id: staffData.employee_id || undefined,
                  department_id: staffData.department_id || null,
                  designation: staffData.designation || null,
                  salary: staffData.salary !== '' ? Number(staffData.salary) : null,
                  date_of_employment: staffData.date_of_employment || null,
                  status: staffData.status,
                }
              : {}),
          }),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || 'Failed to create user');
        onSaved(
          result.message || 'User created successfully',
          { email: formData.email, password: formData.password }
        );
      }
    } catch (err: any) {
      onFailed(err.message);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in dark:bg-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl dark:bg-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? 'Edit User' : `Create ${ROLE_CONFIG[formData.role]?.label || 'User'}`}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:bg-slate-700 rounded-lg">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
              disabled={isEdit}
            />
          </div>

          {!isEdit ? (
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                required
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetPasswordMode}
                  onChange={(e) => {
                    setResetPasswordMode(e.target.checked);
                    if (!e.target.checked) setFormData({ ...formData, password: '' });
                  }}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Reset Password</span>
              </label>
              {resetPasswordMode && (
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input mt-3"
                  required
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              )}
            </div>
          )}

          <div>
            <label className="label">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="input"
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="label">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+234..."
            />
          </div>

          <div>
            <label className="label">Avatar Photo</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="input flex-1"
                placeholder="https://... or upload"
              />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn-outline flex items-center gap-2 whitespace-nowrap"
              >
                {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploadingAvatar ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {needsClasses && (
            <div>
              <label className="label">Assigned Classes</label>
              <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1">
                {classes.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 p-2">No classes found. Create classes first in the Classes page.</p>
                )}
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherClassIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setTeacherClassIds([...teacherClassIds, c.id]);
                        else setTeacherClassIds(teacherClassIds.filter((id) => id !== c.id));
                      }}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{c.name} (Level {c.level})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {needsStudent && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Student Information</h4>
              <div className="space-y-4">
                <div>
                  <label className="label">Class</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="input"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date of Birth</label>
                    <input
                      type="date"
                      value={studentData.date_of_birth}
                      onChange={(e) => setStudentData({ ...studentData, date_of_birth: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select
                      value={studentData.gender}
                      onChange={(e) => setStudentData({ ...studentData, gender: e.target.value })}
                      className="input"
                    >
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea
                    value={studentData.address}
                    onChange={(e) => setStudentData({ ...studentData, address: e.target.value })}
                    className="input"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guardian Name</label>
                    <input
                      type="text"
                      value={studentData.guardian_name}
                      onChange={(e) => setStudentData({ ...studentData, guardian_name: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Guardian Phone</label>
                    <input
                      type="tel"
                      value={studentData.guardian_phone}
                      onChange={(e) => setStudentData({ ...studentData, guardian_phone: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Guardian Email</label>
                    <input
                      type="email"
                      value={studentData.guardian_email}
                      onChange={(e) => setStudentData({ ...studentData, guardian_email: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Blood Group</label>
                    <select
                      value={studentData.blood_group}
                      onChange={(e) => setStudentData({ ...studentData, blood_group: e.target.value })}
                      className="input"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUP_OPTIONS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Emergency Contact</label>
                  <input
                    type="text"
                    value={studentData.emergency_contact}
                    onChange={(e) => setStudentData({ ...studentData, emergency_contact: e.target.value })}
                    className="input"
                    placeholder="Name and phone number"
                  />
                </div>
                <div>
                  <label className="label">Admission Number</label>
                  <input
                    type="text"
                    value={studentData.admission_number}
                    onChange={(e) => setStudentData({ ...studentData, admission_number: e.target.value })}
                    className="input"
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>
            </div>
          )}

          {needsStaff && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Staff Information</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Staff ID</label>
                    <input
                      type="text"
                      value={staffData.staff_id}
                      onChange={(e) => setStaffData({ ...staffData, staff_id: e.target.value })}
                      className="input"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <label className="label">Employee ID</label>
                    <input
                      type="text"
                      value={staffData.employee_id}
                      onChange={(e) => setStaffData({ ...staffData, employee_id: e.target.value })}
                      className="input"
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Department</label>
                    <select
                      value={staffData.department_id}
                      onChange={(e) => setStaffData({ ...staffData, department_id: e.target.value })}
                      className="input"
                    >
                      <option value="">No department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Designation</label>
                    <input
                      type="text"
                      value={staffData.designation}
                      onChange={(e) => setStaffData({ ...staffData, designation: e.target.value })}
                      className="input"
                      placeholder="e.g. Senior Teacher"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Salary</label>
                    <input
                      type="number"
                      value={staffData.salary}
                      onChange={(e) => setStaffData({ ...staffData, salary: e.target.value })}
                      className="input"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="label">Employed</label>
                    <input
                      type="date"
                      value={staffData.date_of_employment}
                      onChange={(e) => setStaffData({ ...staffData, date_of_employment: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={staffData.status}
                      onChange={(e) => setStaffData({ ...staffData, status: e.target.value as 'active' | 'inactive' })}
                      className="input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2 dark:bg-slate-800">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? (
                <><Loader2 size={16} className="animate-spin" />Saving...</>
              ) : isEdit ? (
                'Update User'
              ) : (
                <><UserPlus size={16} className="hidden sm:inline" /> Create User</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}