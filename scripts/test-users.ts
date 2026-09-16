require('dotenv').config({ path: '.env.local' });
import { getAllClasses, getAllDepartments, fetchUsers } from '../src/lib/user-queries';

async function main() {
  try {
    const [cls, dept] = await Promise.all([getAllClasses(), getAllDepartments()]);
    console.log('classes:', cls.length, 'depts:', dept.length);
    const r = await fetchUsers({ limit: 3 });
    console.log('users:', r.users.length, 'total:', r.total);
    console.log('sample users:', r.users.map((u: any) => ({ id: u.id, role: u.role, name: u.first_name + ' ' + u.last_name })));
  } catch (e: any) {
    console.error('ERR:', e.message);
    console.error(e.stack);
  }
}
main();
