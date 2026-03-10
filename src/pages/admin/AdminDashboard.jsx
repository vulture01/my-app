import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../../supabaseClient';
import './AdminDashboard.css';
import { ThemeToggle } from '../../context/ThemeContext';

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      background: toast.type === 'error' ? '#e74c3c' : '#27ae60',
      color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      animation: 'slideIn 0.3s ease',
      display: 'flex', alignItems: 'center', gap: 10
    }}>
      <span>{toast.type === 'error' ? '✕' : '✓'}</span>
      {toast.msg}
    </div>
  );
}

function AIChatBuddy({ adminName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${adminName}! I am your AI admin assistant. Ask me about managing departments, students, announcements, or anything about Studyology!` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a helpful assistant for a college admin using EduSync. Help with administrative tasks, department management, announcements, and institutional queries. Be concise and professional.' },
            ...messages, userMsg
          ],
          max_tokens: 300
        })
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.choices?.[0]?.message?.content || 'Sorry, I could not respond.' }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Error connecting. Try again!' }]);
    }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #e84040, #ff6b35)',
        border: 'none', cursor: 'pointer', fontSize: 24,
        boxShadow: '0 4px 20px rgba(232,64,64,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>{open ? '✕' : '🤖'}</button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 999,
          width: 340, height: 460, background: '#1a1a2e',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid #2a2a3e', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #e84040, #ff6b35)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Admin Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Smart insights at your fingertips</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%',
                background: m.role === 'user' ? '#e84040' : '#2a2a3e',
                color: '#fff', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.5
              }}>{m.content}</div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', background: '#2a2a3e', color: '#aaa', borderRadius: 12, padding: '8px 12px', fontSize: 13 }}>Thinking...</div>}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid #2a2a3e', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..."
              style={{ flex: 1, background: '#2a2a3e', border: '1px solid #3a3a4e', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
            <button onClick={sendMessage} disabled={loading}
              style={{ background: '#e84040', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 16 }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, departments: 0, subjects: 0 });
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Add student form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentYear, setNewStudentYear] = useState('1');
  const [newStudentSection, setNewStudentSection] = useState('A');
  const [newStudentDept, setNewStudentDept] = useState('');
  const [studentMsg, setStudentMsg] = useState('');

  // Add teacher form
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherEmpCode, setNewTeacherEmpCode] = useState('');
  const [newTeacherDept, setNewTeacherDept] = useState('');
  const [teacherMsg, setTeacherMsg] = useState('');

  // Edit student/teacher
  const [editStudent, setEditStudent] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({});
  const [editTeacher, setEditTeacher] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState({});

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annTarget, setAnnTarget] = useState('all');
  const [annSaving, setAnnSaving] = useState(false);
  const [annMsg, setAnnMsg] = useState('');

  // Department form
  const [deptName, setDeptName] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptMsg, setDeptMsg] = useState('');

  // Leave
  const [leaveRequests, setLeaveRequests] = useState([]);

  // Payroll
  const [payrolls, setPayrolls] = useState([]);
  const [showAddPayroll, setShowAddPayroll] = useState(false);
  const [newPayroll, setNewPayroll] = useState({ teacher_id: '', month: '', basic_pay: '', allowances: '', deductions: '', paid: false });
  const [payrollMsg, setPayrollMsg] = useState('');

  // Fees
  const [fees, setFees] = useState([]);

  // Timetable
  const [timetable, setTimetable] = useState([]);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ subject_id: '', day: 'Monday', start_time: '', end_time: '' });
  const [ttMsg, setTtMsg] = useState('');

  // Hall Tickets
  const [exams, setExams] = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [toast, setToast] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single();
      setProfile({ ...prof, id: user.id });

      const [
        { count: sc }, { count: tc }, { count: dc }, { count: subc },
        { data: studs }, { data: tchs }, { data: depts }, { data: subs }, { data: anns },
        { data: leaves }, { data: pays }, { data: feesData }, { data: tt }, { data: examsData }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('subjects').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('id, roll_number, year, section, profiles(full_name, email), departments(name)'),
        supabase.from('teachers').select('id, employee_code, departments(name), profiles(full_name, email)'),
        supabase.from('departments').select('id, name, created_at'),
        supabase.from('subjects').select('id, name, year, section, departments(name)'),
        supabase.from('announcements').select('id, title, body, posted_by, role_target, created_at').order('created_at', { ascending: false }),
        supabase.from('leave_requests').select('id, teacher_id, leave_type, from_date, to_date, reason, status, admin_remark, created_at, profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('payroll').select('id, teacher_id, month, basic_pay, allowances, deductions, net_pay, paid, profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('fees').select('id, student_id, amount, fee_type, due_date, paid, paid_date, profiles(full_name)'),
        supabase.from('timetable').select('id, day, start_time, end_time, subject_id, subjects(name)').order('day'),
        supabase.from('exams').select('id, title, exam_type, exam_date, start_time, end_time, hall, subjects(name)').order('exam_date'),
      ]);

      setStats({ students: sc || 0, teachers: tc || 0, departments: dc || 0, subjects: subc || 0 });
      setStudents(studs || []);
      setTeachers(tchs || []);
      setDepartments(depts || []);
      setSubjects(subs || []);
      setAnnouncements(anns || []);
      setLeaveRequests(leaves || []);
      setPayrolls(pays || []);
      setFees(feesData || []);
      setTimetable(tt || []);
      setExams(examsData || []);

      const { data: attRaw } = await supabase.from('attendance').select('status, subjects(name)');
      if (attRaw) {
        const grouped = {};
        attRaw.forEach(row => {
          const name = row.subjects?.name || 'Unknown';
          if (!grouped[name]) grouped[name] = { name, present: 0, absent: 0 };
          row.status === 'present' ? grouped[name].present++ : grouped[name].absent++;
        });
        setAttendanceChart(Object.values(grouped));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHallTickets(examId) {
    const { data } = await supabase
      .from('hall_tickets')
      .select('id, student_id, seat_number, hall_number, issued, profiles(full_name), students(roll_number)')
      .eq('exam_id', examId);
    setHallTickets(data || []);
  }

  async function createAnnouncement() {
    if (!annTitle.trim()) return;
    setAnnSaving(true); setAnnMsg('');
    try {
      const { error: e } = await supabase.from('announcements').insert({ title: annTitle, body: annBody, posted_by: profile.id, role_target: annTarget });
      if (e) throw e;
      setAnnTitle(''); setAnnBody(''); setAnnTarget('all');
      showToast('Announcement posted!');
      fetchAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setAnnSaving(false); }
  }

  async function deleteAnnouncement(id) {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(a => a.filter(x => x.id !== id));
  }

  async function addStudent() {
    if (!newStudentName.trim() || !newStudentRoll.trim() || !newStudentDept) return;
    setStudentMsg('');
    try {
      const newId = crypto.randomUUID();
      const { error: e1 } = await supabase.from('profiles').insert({ id: newId, full_name: newStudentName.trim(), email: newStudentEmail.trim() || `${newStudentRoll.toLowerCase()}@edusync.com`, role: 'student' });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('students').insert({ id: newId, department_id: newStudentDept, year: parseInt(newStudentYear), section: newStudentSection, roll_number: newStudentRoll.trim() });
      if (e2) throw e2;
      showToast('Student added!');
      setNewStudentName(''); setNewStudentEmail(''); setNewStudentRoll(''); setNewStudentYear('1'); setNewStudentSection('A'); setNewStudentDept('');
      setShowAddStudent(false); fetchAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  async function deleteStudent(id) {
    if (!window.confirm('Delete this student?')) return;
    await supabase.from('students').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
    setStudents(s => s.filter(x => x.id !== id));
  }

  async function handleEditStudentSave() {
    const { error: e1 } = await supabase.from('students').update({ roll_number: editStudentForm.roll_number, year: editStudentForm.year, section: editStudentForm.section }).eq('id', editStudent.id);
    const { error: e2 } = await supabase.from('profiles').update({ full_name: editStudentForm.full_name }).eq('id', editStudent.id);
    if (e1 || e2) { showToast('Error saving.', 'error'); return; }
    setStudents(prev => prev.map(s => s.id === editStudent.id ? { ...s, roll_number: editStudentForm.roll_number, year: editStudentForm.year, section: editStudentForm.section, profiles: { ...s.profiles, full_name: editStudentForm.full_name } } : s));
    setEditStudent(null); showToast('Student updated.');
  }

  async function addTeacher() {
    if (!newTeacherName.trim() || !newTeacherEmpCode.trim() || !newTeacherDept) return;
    setTeacherMsg('');
    try {
      const newId = crypto.randomUUID();
      const { error: e1 } = await supabase.from('profiles').insert({ id: newId, full_name: newTeacherName.trim(), email: newTeacherEmail.trim() || `${newTeacherEmpCode.toLowerCase()}@edusync.com`, role: 'teacher' });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('teachers').insert({ id: newId, department_id: newTeacherDept, employee_code: newTeacherEmpCode.trim() });
      if (e2) throw e2;
      showToast('Teacher added!');
      setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherEmpCode(''); setNewTeacherDept('');
      setShowAddTeacher(false); fetchAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  async function deleteTeacher(id) {
    if (!window.confirm('Delete this teacher?')) return;
    await supabase.from('teachers').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
    setTeachers(t => t.filter(x => x.id !== id));
  }

  async function handleEditTeacherSave() {
    const { error: e1 } = await supabase.from('teachers').update({ employee_code: editTeacherForm.employee_code }).eq('id', editTeacher.id);
    const { error: e2 } = await supabase.from('profiles').update({ full_name: editTeacherForm.full_name }).eq('id', editTeacher.id);
    if (e1 || e2) { showToast('Error saving.', 'error'); return; }
    setTeachers(prev => prev.map(t => t.id === editTeacher.id ? { ...t, employee_code: editTeacherForm.employee_code, profiles: { ...t.profiles, full_name: editTeacherForm.full_name } } : t));
    setEditTeacher(null); showToast('Teacher updated.');
  }

  async function createDepartment() {
    if (!deptName.trim()) return;
    setDeptSaving(true); setDeptMsg('');
    try {
      const { error: e } = await supabase.from('departments').insert({ name: deptName });
      if (e) throw e;
      setDeptName(''); showToast('Department created!'); fetchAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    finally { setDeptSaving(false); }
  }

  async function deleteDepartment(id) {
    const { error: e } = await supabase.from('departments').delete().eq('id', id);
    if (!e) setDepartments(d => d.filter(x => x.id !== id));
  }

  async function updateLeaveStatus(id, status, remark) {
    await supabase.from('leave_requests').update({ status, admin_remark: remark }).eq('id', id);
    setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status, admin_remark: remark } : l));
  }

  async function addPayroll() {
    if (!newPayroll.teacher_id || !newPayroll.month || !newPayroll.basic_pay) { setPayrollMsg('Teacher, month and basic pay are required.'); return; }
    const { error: e } = await supabase.from('payroll').insert({
      teacher_id: newPayroll.teacher_id,
      month: newPayroll.month,
      basic_pay: Number(newPayroll.basic_pay),
      allowances: Number(newPayroll.allowances || 0),
      deductions: Number(newPayroll.deductions || 0),
      paid: newPayroll.paid
    });
    if (e) { showToast('Error: ' + e.message, 'error'); return; }
    showToast('Payroll added!');
    setNewPayroll({ teacher_id: '', month: '', basic_pay: '', allowances: '', deductions: '', paid: false });
    setShowAddPayroll(false); fetchAll();
  }

  async function toggleFee(id, currentPaid) {
    await supabase.from('fees').update({ paid: !currentPaid, paid_date: !currentPaid ? new Date().toISOString().split('T')[0] : null }).eq('id', id);
    setFees(prev => prev.map(f => f.id === id ? { ...f, paid: !currentPaid } : f));
  }

  async function addTimetableSlot() {
    if (!newSlot.subject_id || !newSlot.start_time || !newSlot.end_time) { setTtMsg('All fields required.'); return; }
    const { error: e } = await supabase.from('timetable').insert({ subject_id: newSlot.subject_id, day: newSlot.day, start_time: newSlot.start_time, end_time: newSlot.end_time });
    if (e) { showToast('Error: ' + e.message, 'error'); return; }
    showToast('Slot added!');
    setNewSlot({ subject_id: '', day: 'Monday', start_time: '', end_time: '' });
    setShowAddSlot(false); fetchAll();
  }

  async function deleteTimetableSlot(id) {
    await supabase.from('timetable').delete().eq('id', id);
    setTimetable(prev => prev.filter(t => t.id !== id));
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading) return <div className="ad-loading"><div className="ad-spinner" /><p>Loading...</p></div>;
  if (error) return <div className="ad-error">{error}</div>;

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="ad-root">
      <header className="ad-header">
        <div className="ad-logo">Study<span>ology</span></div>
        <div className="ad-header-center"><span className="ad-role-badge">ADMIN</span></div>
        <div className="ad-header-right">
          <span className="ad-name">{profile?.full_name || 'Admin'}</span>
          <ThemeToggle />
          <button className="ad-logout" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Logout</button>
        </div>
      </header>

      <div className="ad-stats">
        {[
          { val: stats.departments, label: 'DEPARTMENTS' },
          { val: stats.subjects, label: 'SUBJECTS' },
          { val: stats.teachers, label: 'TEACHERS' },
          { val: stats.students, label: 'STUDENTS' },
        ].map(s => (
          <div className="ad-stat-card" key={s.label}>
            <div className="ad-stat-val">{s.val}</div>
            <div className="ad-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <nav className="ad-tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'users', label: 'Users' },
          { id: 'departments', label: 'Departments' },
          { id: 'announcements', label: 'Announcements' },
          { id: 'leave', label: 'Leave' },
          { id: 'payroll', label: 'Payroll' },
          { id: 'fees', label: 'Fees' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'halltickets', label: 'Hall Tickets' },
        ].map(t => (
          <button key={t.id} className={`ad-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ad-content">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Recent Announcements</h2>
                <span className="ad-badge">{announcements.length} total</span>
              </div>
              <div className="ad-ann-preview">
                {announcements.slice(0, 5).map(a => (
                  <div key={a.id} className="ad-ann-preview-item">
                    <div className="ad-ann-dot" />
                    <div>
                      <div className="ad-ann-title">{a.title}</div>
                      <div className="ad-ann-meta">
                        <span className={`ad-target-pill ${a.role_target}`}>{a.role_target}</span>
                        <span className="ad-muted">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <p className="ad-empty">No announcements yet.</p>}
              </div>
            </div>
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Subjects</h2>
                <span className="ad-badge">{subjects.length} total</span>
              </div>
              <div className="ad-subjects-list">
                {subjects.map(s => (
                  <div key={s.id} className="ad-subject-row">
                    <div className="ad-subject-name">{s.name}</div>
                    <div className="ad-subject-meta"><span>Year {s.year} · Sec {s.section}</span></div>
                  </div>
                ))}
                {subjects.length === 0 && <p className="ad-empty">No subjects.</p>}
              </div>
            </div>
          </div>

          <div className="ad-grid-2" style={{ marginTop: 24 }}>
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>Attendance by Subject</h2></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceChart} margin={{ top: 10, right: 10, left: -20, bottom: 50 }}>
                  <XAxis dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: '#aaa', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#fff' }} />
                  <Bar dataKey="present" fill="#27ae60" radius={[4,4,0,0]} name="Present" />
                  <Bar dataKey="absent" fill="#e84040" radius={[4,4,0,0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>Fees Overview</h2></div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Paid', value: fees.filter(f => f.paid).length },
                      { name: 'Unpaid', value: fees.filter(f => !f.paid).length }
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" paddingAngle={4}
                  >
                    <Cell fill="#27ae60" />
                    <Cell fill="#e84040" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a3e', color: '#fff' }} />
                  <Legend formatter={(v) => <span style={{ color: '#aaa', fontSize: 13 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Students</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="ad-badge">{students.length} total</span>
                  <button style={{ padding: '4px 14px', fontSize: 12, background: '#e84040', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setShowAddStudent(s => !s)}>
                    {showAddStudent ? 'Cancel' : '+ Add'}
                  </button>
                </div>
              </div>
              <input
                placeholder="Search by name or roll number..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 10, padding: '7px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0f0f1a', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              {showAddStudent && (
                <div className="ad-form" style={{ marginBottom: 12 }}>
                  <div className="ad-form-group"><label>Full Name *</label><input placeholder="e.g. Arjun Kumar" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} /></div>
                  <div className="ad-form-group"><label>Email</label><input placeholder="auto-generated if empty" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} /></div>
                  <div className="ad-form-group"><label>Roll Number *</label><input placeholder="e.g. BCA2024007" value={newStudentRoll} onChange={e => setNewStudentRoll(e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div className="ad-form-group"><label>Year</label><select value={newStudentYear} onChange={e => setNewStudentYear(e.target.value)}>{['1', '2', '3'].map(y => <option key={y}>{y}</option>)}</select></div>
                    <div className="ad-form-group"><label>Section</label><select value={newStudentSection} onChange={e => setNewStudentSection(e.target.value)}>{['A', 'B', 'C'].map(s => <option key={s}>{s}</option>)}</select></div>
                    <div className="ad-form-group"><label>Department *</label><select value={newStudentDept} onChange={e => setNewStudentDept(e.target.value)}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  </div>
                  <div className="ad-form-footer">
                    {studentMsg && <span className="ad-msg">{studentMsg}</span>}
                    <button className="ad-btn-save" onClick={addStudent}>+ Add Student</button>
                  </div>
                </div>
              )}
              <table className="ad-table">
                <thead><tr><th>Roll No</th><th>Name</th><th>Dept</th><th>Year</th><th>Action</th></tr></thead>
                <tbody>
                  {students.filter(s =>
                    s.profiles?.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.roll_number?.toLowerCase().includes(studentSearch.toLowerCase())
                  ).map(s => (
                    <tr key={s.id}>
                      {editStudent?.id === s.id ? (
                        <>
                          <td><input className="td-marks-input" value={editStudentForm.roll_number} onChange={e => setEditStudentForm(f => ({ ...f, roll_number: e.target.value }))} style={{ width: 110 }} /></td>
                          <td><input className="td-marks-input" value={editStudentForm.full_name} onChange={e => setEditStudentForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: 120 }} /></td>
                          <td className="ad-muted">{s.departments?.name || '—'}</td>
                          <td>
                            <select className="td-marks-input" value={editStudentForm.year} onChange={e => setEditStudentForm(f => ({ ...f, year: e.target.value }))} style={{ width: 50 }}>
                              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                            </select>
                          </td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleEditStudentSave} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Save</button>
                            <button onClick={() => setEditStudent(null)} style={{ background: 'var(--card-bg-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="ad-roll">{s.roll_number}</span></td>
                          <td>{s.profiles?.full_name || '—'}</td>
                          <td className="ad-muted">{s.departments?.name || '—'}</td>
                          <td>Y{s.year}-{s.section}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditStudent(s); setEditStudentForm({ full_name: s.profiles?.full_name || '', roll_number: s.roll_number, year: String(s.year), section: s.section }); setStudentMsg(''); }}
                              style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid #27ae60', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                            <button onClick={() => deleteStudent(s.id)}
                              style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={5} className="ad-empty">No students.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Teachers</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="ad-badge">{teachers.length} total</span>
                  <button style={{ padding: '4px 14px', fontSize: 12, background: '#e84040', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setShowAddTeacher(s => !s)}>
                    {showAddTeacher ? 'Cancel' : '+ Add'}
                  </button>
                </div>
              </div>
              <input
                placeholder="Search by name or emp code..."
                value={teacherSearch}
                onChange={e => setTeacherSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 10, padding: '7px 12px', borderRadius: 8, border: '1px solid #2a2a3e', background: '#0f0f1a', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              {showAddTeacher && (
                <div className="ad-form" style={{ marginBottom: 12 }}>
                  <div className="ad-form-group"><label>Full Name *</label><input placeholder="e.g. Dr. Ravi Kumar" value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} /></div>
                  <div className="ad-form-group"><label>Email</label><input placeholder="auto-generated if empty" value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div className="ad-form-group"><label>Employee Code *</label><input placeholder="e.g. TC004" value={newTeacherEmpCode} onChange={e => setNewTeacherEmpCode(e.target.value)} /></div>
                    <div className="ad-form-group"><label>Department *</label><select value={newTeacherDept} onChange={e => setNewTeacherDept(e.target.value)}><option value="">Select</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  </div>
                  <div className="ad-form-footer">
                    {teacherMsg && <span className="ad-msg">{teacherMsg}</span>}
                    <button className="ad-btn-save" onClick={addTeacher}>+ Add Teacher</button>
                  </div>
                </div>
              )}
              <table className="ad-table">
                <thead><tr><th>Emp Code</th><th>Name</th><th>Email</th><th>Dept</th><th>Action</th></tr></thead>
                <tbody>
                  {teachers.filter(t =>
                    t.profiles?.full_name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
                    t.employee_code?.toLowerCase().includes(teacherSearch.toLowerCase())
                  ).map(t => (
                    <tr key={t.id}>
                      {editTeacher?.id === t.id ? (
                        <>
                          <td><input className="td-marks-input" value={editTeacherForm.employee_code} onChange={e => setEditTeacherForm(f => ({ ...f, employee_code: e.target.value }))} style={{ width: 80 }} /></td>
                          <td><input className="td-marks-input" value={editTeacherForm.full_name} onChange={e => setEditTeacherForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: 130 }} /></td>
                          <td className="ad-muted">{t.profiles?.email || '—'}</td>
                          <td className="ad-muted">{t.departments?.name || '—'}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleEditTeacherSave} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Save</button>
                            <button onClick={() => setEditTeacher(null)} style={{ background: 'var(--card-bg-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="ad-roll">{t.employee_code}</span></td>
                          <td>{t.profiles?.full_name || '—'}</td>
                          <td className="ad-muted">{t.profiles?.email || '—'}</td>
                          <td className="ad-muted">{t.departments?.name || '—'}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditTeacher(t); setEditTeacherForm({ full_name: t.profiles?.full_name || '', employee_code: t.employee_code || '' }); setTeacherMsg(''); }}
                              style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid #27ae60', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                            <button onClick={() => deleteTeacher(t.id)}
                              style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan={5} className="ad-empty">No teachers.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>Departments</h2><span className="ad-badge">{departments.length} total</span></div>
              <div className="ad-dept-list">
                {departments.map(d => (
                  <div key={d.id} className="ad-dept-row">
                    <div className="ad-dept-info">
                      <span className="ad-dept-name">{d.name}</span>
                    </div>
                    <button className="ad-btn-delete" onClick={() => deleteDepartment(d.id)}>✕</button>
                  </div>
                ))}
                {departments.length === 0 && <p className="ad-empty">No departments yet.</p>}
              </div>
            </div>
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>Add Department</h2></div>
              <div className="ad-form">
                <div className="ad-form-group"><label>Department Name</label><input type="text" placeholder="e.g. Information Technology" value={deptName} onChange={e => setDeptName(e.target.value)} /></div>
                <div className="ad-form-footer">
                  {deptMsg && <span className="ad-msg">{deptMsg}</span>}
                  <button className="ad-btn-save" onClick={createDepartment} disabled={deptSaving}>{deptSaving ? 'Creating...' : '+ Create Department'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>New Announcement</h2></div>
              <div className="ad-form">
                <div className="ad-form-group"><label>Title</label><input type="text" placeholder="Announcement title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} /></div>
                <div className="ad-form-group"><label>Message</label><textarea rows={4} placeholder="Write your message..." value={annBody} onChange={e => setAnnBody(e.target.value)} /></div>
                <div className="ad-form-group">
                  <label>Target Audience</label>
                  <select value={annTarget} onChange={e => setAnnTarget(e.target.value)}>
                    <option value="all">Everyone</option>
                    <option value="student">Students only</option>
                    <option value="teacher">Teachers only</option>
                  </select>
                </div>
                <div className="ad-form-footer">
                  {annMsg && <span className="ad-msg">{annMsg}</span>}
                  <button className="ad-btn-save" onClick={createAnnouncement} disabled={annSaving}>{annSaving ? 'Posting...' : 'Post Announcement'}</button>
                </div>
              </div>
            </div>
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>All Announcements</h2><span className="ad-badge">{announcements.length}</span></div>
              <div className="ad-ann-list">
                {announcements.map(a => (
                  <div key={a.id} className="ad-ann-item">
                    <div className="ad-ann-item-header">
                      <span className="ad-ann-item-title">{a.title}</span>
                      <button className="ad-btn-delete" onClick={() => deleteAnnouncement(a.id)}>✕</button>
                    </div>
                    <p className="ad-ann-item-body">{a.body}</p>
                    <div className="ad-ann-item-footer">
                      <span className={`ad-target-pill ${a.role_target}`}>{a.role_target}</span>
                      <span className="ad-muted">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && <p className="ad-empty">No announcements yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* LEAVE APPROVAL */}
        {activeTab === 'leave' && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>Leave Approval</h2>
              <span className="ad-badge">{leaveRequests.length} requests</span>
            </div>
            {leaveRequests.length === 0 ? <p className="ad-empty">No leave requests.</p> : (
              <table className="ad-table">
                <thead>
                  <tr><th>Teacher</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Remark</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {leaveRequests.map(l => (
                    <tr key={l.id}>
                      <td>{l.profiles?.full_name || '—'}</td>
                      <td>{l.leave_type}</td>
                      <td>{l.from_date}</td>
                      <td>{l.to_date}</td>
                      <td className="ad-muted">{l.reason}</td>
                      <td>
                        <span style={{
                          padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                          background: l.status === 'Approved' ? 'rgba(39,174,96,0.15)' : l.status === 'Rejected' ? 'rgba(231,76,60,0.15)' : 'rgba(241,196,15,0.15)',
                          color: l.status === 'Approved' ? '#27ae60' : l.status === 'Rejected' ? '#e74c3c' : '#f1c40f'
                        }}>{l.status}</span>
                      </td>
                      <td>
                        <input className="td-marks-input" placeholder="Add remark..." defaultValue={l.admin_remark || ''}
                          onBlur={async e => { await supabase.from('leave_requests').update({ admin_remark: e.target.value }).eq('id', l.id); }}
                          style={{ width: 140 }} />
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        {l.status === 'Pending' && (
                          <>
                            <button onClick={() => updateLeaveStatus(l.id, 'Approved', l.admin_remark)}
                              style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid #27ae60', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Approve</button>
                            <button onClick={() => updateLeaveStatus(l.id, 'Rejected', l.admin_remark)}
                              style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PAYROLL */}
        {activeTab === 'payroll' && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>Staff Payroll</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="ad-badge">{payrolls.length} records</span>
                <button style={{ padding: '4px 14px', fontSize: 12, background: '#e84040', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setShowAddPayroll(p => !p)}>
                  {showAddPayroll ? 'Cancel' : '+ Add'}
                </button>
              </div>
            </div>
            {showAddPayroll && (
              <div className="ad-form" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ad-form-group">
                    <label>Teacher *</label>
                    <select value={newPayroll.teacher_id} onChange={e => setNewPayroll(p => ({ ...p, teacher_id: e.target.value }))}>
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.profiles?.full_name}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group"><label>Month *</label><input placeholder="e.g. April 2026" value={newPayroll.month} onChange={e => setNewPayroll(p => ({ ...p, month: e.target.value }))} /></div>
                  <div className="ad-form-group"><label>Basic Pay *</label><input type="number" placeholder="e.g. 55000" value={newPayroll.basic_pay} onChange={e => setNewPayroll(p => ({ ...p, basic_pay: e.target.value }))} /></div>
                  <div className="ad-form-group"><label>Allowances</label><input type="number" placeholder="e.g. 22000" value={newPayroll.allowances} onChange={e => setNewPayroll(p => ({ ...p, allowances: e.target.value }))} /></div>
                  <div className="ad-form-group"><label>Deductions</label><input type="number" placeholder="e.g. 11600" value={newPayroll.deductions} onChange={e => setNewPayroll(p => ({ ...p, deductions: e.target.value }))} /></div>
                  <div className="ad-form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
                    <input type="checkbox" id="paidCheck" checked={newPayroll.paid} onChange={e => setNewPayroll(p => ({ ...p, paid: e.target.checked }))} />
                    <label htmlFor="paidCheck" style={{ color: 'var(--text)' }}>Mark as Paid</label>
                  </div>
                </div>
                <div className="ad-form-footer">
                  {payrollMsg && <span className="ad-msg">{payrollMsg}</span>}
                  <button className="ad-btn-save" onClick={addPayroll}>+ Add Payroll</button>
                </div>
              </div>
            )}
            <table className="ad-table">
              <thead><tr><th>Teacher</th><th>Month</th><th>Basic Pay</th><th>Allowances</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
              <tbody>
                {payrolls.map(p => (
                  <tr key={p.id}>
                    <td>{p.profiles?.full_name || '—'}</td>
                    <td>{p.month}</td>
                    <td>Rs. {p.basic_pay?.toLocaleString('en-IN')}</td>
                    <td>Rs. {p.allowances?.toLocaleString('en-IN')}</td>
                    <td>Rs. {p.deductions?.toLocaleString('en-IN')}</td>
                    <td>Rs. {p.net_pay?.toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: p.paid ? 'rgba(39,174,96,0.15)' : 'rgba(241,196,15,0.15)', color: p.paid ? '#27ae60' : '#f1c40f' }}>
                        {p.paid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {payrolls.length === 0 && <tr><td colSpan={7} className="ad-empty">No payroll records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* FEES */}
        {activeTab === 'fees' && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>Fees Management</h2>
              <span className="ad-badge">{fees.length} records</span>
            </div>
            <table className="ad-table">
              <thead><tr><th>Student</th><th>Fee Type</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td>{f.profiles?.full_name || '—'}</td>
                    <td>{f.fee_type}</td>
                    <td>Rs. {f.amount?.toLocaleString('en-IN')}</td>
                    <td>{f.due_date}</td>
                    <td>
                      <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: f.paid ? 'rgba(39,174,96,0.15)' : 'rgba(231,76,60,0.15)', color: f.paid ? '#27ae60' : '#e74c3c' }}>
                        {f.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => toggleFee(f.id, f.paid)}
                        style={{ background: f.paid ? 'rgba(231,76,60,0.15)' : 'rgba(39,174,96,0.15)', color: f.paid ? '#e74c3c' : '#27ae60', border: `1px solid ${f.paid ? '#e74c3c' : '#27ae60'}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                        {f.paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                    </td>
                  </tr>
                ))}
                {fees.length === 0 && <tr><td colSpan={6} className="ad-empty">No fee records.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* TIMETABLE */}
        {activeTab === 'timetable' && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>Timetable</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="ad-badge">{timetable.length} slots</span>
                <button style={{ padding: '4px 14px', fontSize: 12, background: '#e84040', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }} onClick={() => setShowAddSlot(s => !s)}>
                  {showAddSlot ? 'Cancel' : '+ Add Slot'}
                </button>
              </div>
            </div>
            {showAddSlot && (
              <div className="ad-form" style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                  <div className="ad-form-group">
                    <label>Subject *</label>
                    <select value={newSlot.subject_id} onChange={e => setNewSlot(s => ({ ...s, subject_id: e.target.value }))}>
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group">
                    <label>Day *</label>
                    <select value={newSlot.day} onChange={e => setNewSlot(s => ({ ...s, day: e.target.value }))}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="ad-form-group"><label>Start Time *</label><input type="time" value={newSlot.start_time} onChange={e => setNewSlot(s => ({ ...s, start_time: e.target.value }))} /></div>
                  <div className="ad-form-group"><label>End Time *</label><input type="time" value={newSlot.end_time} onChange={e => setNewSlot(s => ({ ...s, end_time: e.target.value }))} /></div>
                </div>
                <div className="ad-form-footer">
                  {ttMsg && <span className="ad-msg">{ttMsg}</span>}
                  <button className="ad-btn-save" onClick={addTimetableSlot}>+ Add Slot</button>
                </div>
              </div>
            )}
            <table className="ad-table">
              <thead><tr><th>Day</th><th>Subject</th><th>Start</th><th>End</th><th>Action</th></tr></thead>
              <tbody>
                {timetable.map(t => (
                  <tr key={t.id}>
                    <td>{t.day}</td>
                    <td>{t.subjects?.name || '—'}</td>
                    <td>{t.start_time?.slice(0, 5)}</td>
                    <td>{t.end_time?.slice(0, 5)}</td>
                    <td>
                      <button onClick={() => deleteTimetableSlot(t.id)}
                        style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {timetable.length === 0 && <tr><td colSpan={5} className="ad-empty">No timetable slots.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* HALL TICKETS */}
        {activeTab === 'halltickets' && (
          <div className="ad-panel">
            <div className="ad-panel-header">
              <h2>Hall Tickets</h2>
              <span className="ad-badge">{exams.length} exams</span>
            </div>
            <div className="ad-form-group" style={{ marginBottom: 16, maxWidth: 360 }}>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6, display: 'block' }}>Select Exam</label>
              <select value={selectedExam} onChange={e => { setSelectedExam(e.target.value); if (e.target.value) loadHallTickets(e.target.value); }}>
                <option value="">Select an exam...</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.title} — {e.exam_date} ({e.subjects?.name})</option>)}
              </select>
            </div>
            {selectedExam && (
              <table className="ad-table">
                <thead><tr><th>Roll No</th><th>Student</th><th>Hall</th><th>Seat No</th><th>Status</th></tr></thead>
                <tbody>
                  {hallTickets.map(h => (
                    <tr key={h.id}>
                      <td><span className="ad-roll">{h.students?.roll_number || '—'}</span></td>
                      <td>{h.profiles?.full_name || '—'}</td>
                      <td>{h.hall_number}</td>
                      <td>{h.seat_number}</td>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: h.issued ? 'rgba(39,174,96,0.15)' : 'rgba(241,196,15,0.15)', color: h.issued ? '#27ae60' : '#f1c40f' }}>
                          {h.issued ? 'Issued' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {hallTickets.length === 0 && <tr><td colSpan={5} className="ad-empty">No hall tickets for this exam.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
      <AIChatBuddy adminName={profile?.full_name?.split(' ')[0] || 'Admin'} />
      <Toast toast={toast} />
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}
