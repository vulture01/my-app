import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './TeacherDashboard.css';
import { ThemeToggle } from '../../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GRADE_COLORS = {
  S: '#9b59b6', A: '#27ae60', B: '#f1c40f', C: '#e67e22', D: '#e74c3c', F: '#e74c3c'
};

function getGrade(score, max) {
  const p = (score / max) * 100;
  if (p >= 90) return 'S';
  if (p >= 75) return 'A';
  if (p >= 60) return 'B';
  if (p >= 50) return 'C';
  if (p >= 35) return 'D';
  return 'F';
}

function AIChatBuddy({ teacherName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${teacherName}! I am your AI assistant. Ask me about lesson planning, student performance, or anything academic!` }
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
            { role: 'system', content: 'You are a helpful assistant for a college teacher using EduSync. Help with lesson planning, attendance analysis, student performance, and academic queries. Be concise and professional.' },
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
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Teaching Assistant</div>
            </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Here to help you teach better</div>
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
              style={{ background: '#e84040', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── PAYROLL TAB ──────────────────────────────────────────────────────────────
function PayrollTab({ teacherId }) {
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('payroll')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('month', { ascending: false });
      setPayroll(data || []);
      setLoading(false);
    }
    if (teacherId) load();
  }, [teacherId]);

  if (loading) return <p className="td-empty">Loading payroll...</p>;

  const latest = payroll[0];

  return (
    <div className="td-panel">
      <div className="td-panel-header"><h2>Payroll</h2></div>

      {latest ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Basic Pay', val: latest.basic_pay },
            { label: 'Allowances', val: latest.allowances },
            { label: 'Deductions', val: latest.deductions },
            { label: 'Net Pay', val: latest.net_pay, highlight: true },
          ].map(({ label, val, highlight }) => (
            <div key={label} style={{
              background: highlight ? 'rgba(232,64,64,0.1)' : 'var(--card-bg-2)',
              border: `1px solid ${highlight ? '#e84040' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px'
            }}>
              <div style={{ color: 'var(--text-muted, #aaa)', fontSize: 11, marginBottom: 4 }}>{label}</div>
              <div style={{ color: highlight ? '#e84040' : 'var(--text)', fontWeight: 700, fontSize: 18 }}>
                Rs. {val?.toLocaleString('en-IN') ?? '—'}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="td-empty">No payroll data found.</p>
      )}

      {payroll.length > 0 && (
        <>
          <h3 style={{ color: 'var(--text, #fff)', marginBottom: 12, fontSize: 15 }}>Monthly History</h3>
          <table className="td-table">
            <thead>
              <tr><th>Month</th><th>Basic Pay</th><th>Allowances</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payroll.map((p, i) => (
                <tr key={i}>
                  <td>{p.month}</td>
                  <td>Rs. {p.basic_pay?.toLocaleString('en-IN')}</td>
                  <td>Rs. {p.allowances?.toLocaleString('en-IN')}</td>
                  <td>Rs. {p.deductions?.toLocaleString('en-IN')}</td>
                  <td>Rs. {p.net_pay?.toLocaleString('en-IN')}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: p.paid ? 'rgba(39,174,96,0.15)' : 'rgba(241,196,15,0.15)',
                      color: p.paid ? '#27ae60' : '#f1c40f'
                    }}>{p.paid ? 'Paid' : 'Pending'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ── LEAVE TAB ────────────────────────────────────────────────────────────────
function LeaveTab({ teacherId }) {
  const [leaves, setLeaves] = useState([]);
  const [leaveType, setLeaveType] = useState('Casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLeaves(); }, [teacherId]);

  async function loadLeaves() {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    setLeaves(data || []);
  }

  async function submitLeave() {
    if (!fromDate || !toDate || !reason) { setMsg('All fields are required.'); return; }
    setSaving(true); setMsg('');
    const { error } = await supabase.from('leave_requests').insert({
      teacher_id: teacherId,
      leave_type: leaveType,
      from_date: fromDate,
      to_date: toDate,
      reason,
      status: 'Pending'
    });
    if (error) { setMsg('Error: ' + error.message); }
    else {
      setMsg('Leave request submitted successfully!');
      setFromDate(''); setToDate(''); setReason('');
      loadLeaves();
    }
    setSaving(false);
  }

  const statusColor = { Pending: '#f1c40f', Approved: '#27ae60', Rejected: '#e74c3c' };

  return (
    <div className="td-panel">
      <div className="td-panel-header"><h2>Leave Requests</h2></div>

      {/* Request Form */}
      <div style={{ background: 'var(--card-bg, #1a1a2e)', border: '1px solid #2a2a3e', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ color: 'var(--text, #fff)', marginBottom: 16, fontSize: 15 }}>New Leave Request</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="td-control-group">
            <label>Leave Type</label>
            <select value={leaveType} onChange={e => setLeaveType(e.target.value)}>
              <option>Casual</option>
              <option>Medical</option>
              <option>Emergency</option>
            </select>
          </div>
          <div className="td-control-group">
            <label>From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="td-control-group">
            <label>To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
        </div>
        <div className="td-control-group" style={{ marginBottom: 14 }}>
          <label>Reason</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..." style={{ width: '100%' }} />
        </div>
        {msg && <p style={{ color: msg.startsWith('Error') ? '#e74c3c' : '#27ae60', fontSize: 13, marginBottom: 10 }}>{msg}</p>}
        <button className="td-btn-save" onClick={submitLeave} disabled={saving}>
          {saving ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>

      {/* History Table */}
      {leaves.length === 0 ? (
        <p className="td-empty">No leave requests yet.</p>
      ) : (
        <table className="td-table">
          <thead>
            <tr><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr>
          </thead>
          <tbody>
            {leaves.map((l, i) => (
              <tr key={i}>
                <td>{l.leave_type}</td>
                <td>{l.from_date}</td>
                <td>{l.to_date}</td>
                <td className="td-muted">{l.reason}</td>
                <td>
                  <span style={{
                    padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: (statusColor[l.status] || '#aaa') + '22',
                    color: statusColor[l.status] || '#aaa'
                  }}>{l.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('students');
  const [activeDay, setActiveDay] = useState(0);

  // Attendance
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [existingAttendance, setExistingAttendance] = useState([]);

  // Marks
  const [marksSubject, setMarksSubject] = useState(null);
  const [examType, setExamType] = useState('CAT1');
  const [marksMap, setMarksMap] = useState({});
  const [maxScore, setMaxScore] = useState(50);
  const [marksSaving, setMarksSaving] = useState(false);
  const [marksMsg, setMarksMsg] = useState('');
  const [existingMarks, setExistingMarks] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addMode, setAddMode] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', roll_number: '', year: '2', section: 'A' });
  const [studentMsg, setStudentMsg] = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prof }, { data: teach }] = await Promise.all([
        supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single(),
        supabase.from('teachers').select('id, department_id, employee_code').eq('id', user.id).single(),
      ]);
      setProfile({ ...prof, id: user.id, ...teach });

      const { data: subs } = await supabase
        .from('subjects').select('id, name, year, section').eq('teacher_id', user.id);
      setSubjects(subs || []);
      if (subs?.length) { setSelectedSubject(subs[0].id); setMarksSubject(subs[0].id); }

      const subIds = (subs || []).map(s => s.id);
      if (subIds.length) {
        const { data: studs } = await supabase
          .from('students')
          .select('id, roll_number, year, section, profiles(full_name, email)')
          .eq('year', 2).eq('section', 'A');
        setStudents(studs || []);
        const init = {};
        (studs || []).forEach(s => { init[s.id] = 'present'; });
        setAttendanceMap(init);
        const marksInit = {};
        (studs || []).forEach(s => { marksInit[s.id] = ''; });
        setMarksMap(marksInit);
      }

      const { data: tt } = await supabase
        .from('timetable').select('id, day, start_time, end_time, subjects(name)')
        .in('subject_id', subIds.length ? subIds : ['00000000-0000-0000-0000-000000000000']);
      setTimetable(tt || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Load existing attendance when subject/date changes
  useEffect(() => {
    if (!selectedSubject || !attendanceDate || !students.length) return;
    async function loadExisting() {
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('subject_id', selectedSubject)
        .eq('date', attendanceDate);
      if (data?.length) {
        setExistingAttendance(data);
        const map = {};
        students.forEach(s => { map[s.id] = 'present'; });
        data.forEach(r => { map[r.student_id] = r.status; });
        setAttendanceMap(map);
      } else {
        setExistingAttendance([]);
        const map = {};
        students.forEach(s => { map[s.id] = 'present'; });
        setAttendanceMap(map);
      }
    }
    loadExisting();
  }, [selectedSubject, attendanceDate, students]);

  // Load existing marks when subject/examType changes
  useEffect(() => {
    if (!marksSubject || !examType || !students.length) return;
    async function loadMarks() {
      const { data } = await supabase
        .from('marks').select('id, student_id, score, max_score')
        .eq('subject_id', marksSubject).eq('exam_type', examType);
      setExistingMarks(data || []);
      const map = {};
      students.forEach(s => { map[s.id] = ''; });
      (data || []).forEach(r => { map[r.student_id] = r.score; });
      setMarksMap(map);
      if (data?.[0]?.max_score) setMaxScore(data[0].max_score);
    }
    loadMarks();
  }, [marksSubject, examType, students]);

  async function saveAttendance() {
    if (!selectedSubject) return;
    setAttendanceSaving(true); setAttendanceMsg('');
    try {
      await supabase.from('attendance').delete()
        .eq('subject_id', selectedSubject).eq('date', attendanceDate);
      const rows = students.map(s => ({
        student_id: s.id,
        subject_id: selectedSubject,
        date: attendanceDate,
        status: attendanceMap[s.id] || 'present',
        marked_by: profile?.id,
      }));
      const { error: e } = await supabase.from('attendance').insert(rows);
      if (e) throw e;
      setAttendanceMsg('Attendance saved successfully!');
    } catch (e) {
      setAttendanceMsg('Error: ' + e.message);
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function saveMarks() {
    if (!marksSubject) return;
    setMarksSaving(true); setMarksMsg('');
    try {
      const rows = students
        .filter(s => marksMap[s.id] !== '' && marksMap[s.id] !== undefined)
        .map(s => ({
          student_id: s.id, subject_id: marksSubject,
          exam_type: examType, score: Number(marksMap[s.id]),
          max_score: maxScore, entered_by: profile?.id,
        }));
      for (const r of rows) {
        await supabase.from('marks').delete()
          .eq('student_id', r.student_id).eq('subject_id', r.subject_id).eq('exam_type', r.exam_type);
      }
      const { error: e } = await supabase.from('marks').insert(rows);
      if (e) throw e;
      setMarksMsg('Marks saved successfully!');
      // Reload existing
      const { data } = await supabase.from('marks').select('id, student_id, score, max_score')
        .eq('subject_id', marksSubject).eq('exam_type', examType);
      setExistingMarks(data || []);
    } catch (e) {
      setMarksMsg('Error: ' + e.message);
    } finally {
      setMarksSaving(false);
    }
  }

  async function deleteMarkForStudent(studentId) {
    const existing = existingMarks.find(m => m.student_id === studentId);
    if (!existing) return;
    await supabase.from('marks').delete().eq('id', existing.id);
    setMarksMap(m => ({ ...m, [studentId]: '' }));
    setExistingMarks(ex => ex.filter(m => m.student_id !== studentId));
    setDeleteConfirm(null);
    setMarksMsg('Mark deleted.');
  }

  async function handleDeleteStudent(s) {
    if (!window.confirm(`Delete ${s.profiles?.full_name}? This cannot be undone.`)) return;
    await supabase.from('students').delete().eq('id', s.id);
    setStudents(prev => prev.filter(x => x.id !== s.id));
    setStudentMsg('Student deleted.');
  }

  async function handleEditSave() {
    const { error: e1 } = await supabase.from('students')
      .update({ roll_number: editForm.roll_number, year: editForm.year, section: editForm.section })
      .eq('id', editStudent.id);
    const { error: e2 } = await supabase.from('profiles')
      .update({ full_name: editForm.full_name })
      .eq('id', editStudent.id);
    if (e1 || e2) { setStudentMsg('Error saving.'); return; }
    setStudents(prev => prev.map(s => s.id === editStudent.id
      ? { ...s, roll_number: editForm.roll_number, year: editForm.year, section: editForm.section, profiles: { ...s.profiles, full_name: editForm.full_name } }
      : s));
    setEditStudent(null);
    setStudentMsg('Student updated.');
  }

  async function handleAddStudent() {
    if (!addForm.full_name || !addForm.roll_number) { setStudentMsg('Name and Roll No are required.'); return; }
    const newId = crypto.randomUUID();
    const { error: e1 } = await supabase.from('profiles').insert({
      id: newId, full_name: addForm.full_name,
      email: addForm.roll_number.toLowerCase() + '@edusync.com', role: 'student'
    });
    const { error: e2 } = await supabase.from('students').insert({
      id: newId, roll_number: addForm.roll_number,
      year: Number(addForm.year), section: addForm.section
    });
    if (e1 || e2) { setStudentMsg('Error: ' + (e1?.message || e2?.message)); return; }
    const newStudent = { id: newId, roll_number: addForm.roll_number, year: Number(addForm.year), section: addForm.section, profiles: { full_name: addForm.full_name, email: addForm.roll_number.toLowerCase() + '@edusync.com' } };
    setStudents(prev => [...prev, newStudent]);
    setAddMode(false);
    setAddForm({ full_name: '', roll_number: '', year: '2', section: 'A' });
    setStudentMsg('Student added.');
  }

  if (loading) return <div className="td-loading"><div className="td-spinner" /><p>Loading...</p></div>;
  if (error) return <div className="td-error">{error}</div>;

  const todaySlots = timetable.filter(t => t.day === DAYS[activeDay]);
  const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;

  return (
    <div className="td-root">
      {/* Header */}
      <header className="td-header">
        <div className="ad-logo">Study<span>ology</span></div>
        <div className="td-header-center">
          <span className="td-role-badge">TEACHER</span>
        </div>
        <div className="td-header-right">
          <span className="td-name">{profile?.full_name || 'Teacher'}</span>
          <span className="td-emp">EMP: {profile?.employee_code || '—'}</span>
          <ThemeToggle />
          <button className="td-logout" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Logout</button>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="td-stats">
        <div className="td-stat-card">
          <div className="td-stat-val">{subjects.length}</div>
          <div className="td-stat-label">SUBJECTS</div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-val">{students.length}</div>
          <div className="td-stat-label">STUDENTS</div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-val">{todaySlots.length}</div>
          <div className="td-stat-label">TODAY'S CLASSES</div>
        </div>
        <div className="td-stat-card">
          <div className="td-stat-val td-green">{students.length ? Math.round((presentCount / students.length) * 100) : 0}%</div>
          <div className="td-stat-label">PRESENT TODAY</div>
        </div>
      </div>

      {/* Tab Nav */}
      <nav className="td-tabs">
        {['students', 'attendance', 'marks', 'timetable', 'payroll', 'leave'].map(tab => (
          <button key={tab} className={`td-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'students' && 'Students'}
            {tab === 'attendance' && 'Attendance'}
            {tab === 'marks' && 'Marks'}
            {tab === 'timetable' && 'Timetable'}
            {tab === 'payroll' && 'Payroll'}
            {tab === 'leave' && 'Leave'}
          </button>
        ))}
      </nav>

      <div className="td-content">

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="td-panel">
            <div className="td-panel-header">
              <h2>Student List</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="td-badge">{students.length} students</span>
                <button className="td-btn-save" style={{ padding: '5px 14px', fontSize: 13 }} onClick={() => { setAddMode(a => !a); setStudentMsg(''); }}>
                  {addMode ? 'Cancel' : '+ Add Student'}
                </button>
              </div>
            </div>

            {studentMsg && <p style={{ color: studentMsg.startsWith('Error') ? '#e74c3c' : '#27ae60', fontSize: 13, margin: '8px 0' }}>{studentMsg}</p>}

            {/* ADD FORM */}
            {addMode && (
              <div style={{ background: 'var(--card-bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                <div className="td-control-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Ravi Kumar" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="td-control-group">
                  <label>Roll No</label>
                  <input type="text" placeholder="e.g. BCA2024005" value={addForm.roll_number} onChange={e => setAddForm(f => ({ ...f, roll_number: e.target.value }))} />
                </div>
                <div className="td-control-group">
                  <label>Year</label>
                  <select value={addForm.year} onChange={e => setAddForm(f => ({ ...f, year: e.target.value }))}>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                  </select>
                </div>
                <div className="td-control-group">
                  <label>Section</label>
                  <select value={addForm.section} onChange={e => setAddForm(f => ({ ...f, section: e.target.value }))}>
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </div>
                <button className="td-btn-save" onClick={handleAddStudent}>Add</button>
              </div>
            )}

            {students.length === 0 ? <p className="td-empty">No students found.</p> : (
              <table className="td-table">
                <thead><tr><th>#</th><th>Roll No</th><th>Name</th><th>Email</th><th>Year</th><th>Section</th><th>Action</th></tr></thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}>
                      {editStudent?.id === s.id ? (
                        <>
                          <td>{i + 1}</td>
                          <td><input className="td-marks-input" value={editForm.roll_number} onChange={e => setEditForm(f => ({ ...f, roll_number: e.target.value }))} style={{ width: 120 }} /></td>
                          <td><input className="td-marks-input" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: 140 }} /></td>
                          <td className="td-muted">{s.profiles?.email || '—'}</td>
                          <td>
                            <select className="td-marks-input" value={editForm.year} onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))} style={{ width: 70 }}>
                              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                            </select>
                          </td>
                          <td>
                            <select className="td-marks-input" value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} style={{ width: 60 }}>
                              <option>A</option><option>B</option><option>C</option>
                            </select>
                          </td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={handleEditSave} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Save</button>
                            <button onClick={() => setEditStudent(null)} style={{ background: 'var(--card-bg-2)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{i + 1}</td>
                          <td><span className="td-roll">{s.roll_number}</span></td>
                          <td>{s.profiles?.full_name || '—'}</td>
                          <td className="td-muted">{s.profiles?.email || '—'}</td>
                          <td>Year {s.year}</td>
                          <td>Sec {s.section}</td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditStudent(s); setEditForm({ full_name: s.profiles?.full_name || '', roll_number: s.roll_number, year: String(s.year), section: s.section }); setStudentMsg(''); }}
                              style={{ background: 'rgba(39,174,96,0.15)', color: '#27ae60', border: '1px solid #27ae60', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                            <button onClick={() => handleDeleteStudent(s)}
                              style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="td-panel">
            <div className="td-panel-header">
              <h2>Attendance</h2>
              <span className="td-badge">{presentCount}/{students.length} present</span>
            </div>
            <div className="td-controls">
              <div className="td-control-group">
                <label>Subject</label>
                <select value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value)}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="td-control-group">
                <label>Date</label>
                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} />
              </div>
              <div className="td-att-summary">
                <span className="td-present-pill">{presentCount} Present</span>
                <span className="td-absent-pill">{students.length - presentCount} Absent</span>
                {existingAttendance.length > 0 && (
                  <span style={{ fontSize: 12, color: '#f1c40f', padding: '3px 10px', background: 'rgba(241,196,15,0.1)', borderRadius: 999 }}>
                    Editing existing record
                  </span>
                )}
              </div>
            </div>

            {students.length === 0 ? <p className="td-empty">No students found.</p> : (
              <div className="td-att-list">
                <div className="td-att-actions">
                  <button className="td-btn-sm" onClick={() => { const a = {}; students.forEach(s => a[s.id] = 'present'); setAttendanceMap(a); }}>Mark All Present</button>
                  <button className="td-btn-sm td-btn-red" onClick={() => { const a = {}; students.forEach(s => a[s.id] = 'absent'); setAttendanceMap(a); }}>Mark All Absent</button>
                </div>
                {students.map(s => (
                  <div key={s.id} className={`td-att-row ${attendanceMap[s.id] === 'absent' ? 'absent' : 'present'}`}>
                    <div className="td-att-info">
                      <span className="td-att-roll">{s.roll_number}</span>
                      <span className="td-att-name">{s.profiles?.full_name || '—'}</span>
                    </div>
                    <div className="td-att-toggle">
                      <button className={`td-toggle-btn ${attendanceMap[s.id] === 'present' ? 'active-green' : ''}`}
                        onClick={() => setAttendanceMap(m => ({ ...m, [s.id]: 'present' }))}>P</button>
                      <button className={`td-toggle-btn ${attendanceMap[s.id] === 'absent' ? 'active-red' : ''}`}
                        onClick={() => setAttendanceMap(m => ({ ...m, [s.id]: 'absent' }))}>A</button>
                    </div>
                  </div>
                ))}
                <div className="td-save-row">
                  {attendanceMsg && (
                    <span className="td-msg" style={{ color: attendanceMsg.startsWith('Error') ? '#e74c3c' : '#27ae60' }}>
                      {attendanceMsg}
                    </span>
                  )}
                  <button className="td-btn-save" onClick={saveAttendance} disabled={attendanceSaving}>
                    {attendanceSaving ? 'Saving...' : existingAttendance.length > 0 ? 'Update Attendance' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKS TAB */}
        {activeTab === 'marks' && (
          <div className="td-panel">
            <div className="td-panel-header">
              <h2>Marks</h2>
              <span className="td-badge">{students.length} students</span>
            </div>
            <div className="td-controls">
              <div className="td-control-group">
                <label>Subject</label>
                <select value={marksSubject || ''} onChange={e => setMarksSubject(e.target.value)}>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="td-control-group">
                <label>Exam Type</label>
                <select value={examType} onChange={e => setExamType(e.target.value)}>
                  <option value="CAT1">CAT1</option>
                  <option value="CAT2">CAT2</option>
                  <option value="Final">Final</option>
                </select>
              </div>
              <div className="td-control-group">
                <label>Max Score</label>
                <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} min={1} max={100} style={{ width: '80px' }} />
              </div>
            </div>

            {students.length === 0 ? <p className="td-empty">No students found.</p> : (
              <div className="td-marks-list">
                <div className="td-marks-header-row">
                  <span>Roll No</span><span>Name</span><span>Score / {maxScore}</span><span>Grade</span><span>Action</span>
                </div>
                {students.map(s => {
                  const score = Number(marksMap[s.id]);
                  const grade = marksMap[s.id] !== '' ? getGrade(score, maxScore) : '—';
                  const gradeColor = GRADE_COLORS[grade] || '#aaa';
                  const hasExisting = existingMarks.find(m => m.student_id === s.id);
                  return (
                    <div key={s.id} className="td-marks-row">
                      <span className="td-roll">{s.roll_number}</span>
                      <span>{s.profiles?.full_name || '—'}</span>
                      <input type="number" className="td-marks-input" placeholder="—"
                        min={0} max={maxScore} value={marksMap[s.id]}
                        onChange={e => setMarksMap(m => ({ ...m, [s.id]: e.target.value }))} />
                      <span className="td-grade-pill" style={{ background: gradeColor + '22', color: gradeColor, border: `1px solid ${gradeColor}` }}>
                        {grade}
                      </span>
                      {hasExisting && (
                        deleteConfirm === s.id ? (
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => deleteMarkForStudent(s.id)}
                              style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              style={{ background: '#2a2a3e', color: '#aaa', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                          </span>
                        ) : (
                          <button onClick={() => setDeleteConfirm(s.id)}
                            style={{ background: 'rgba(231,76,60,0.15)', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                            Delete
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
                <div className="td-save-row">
                  {marksMsg && (
                    <span className="td-msg" style={{ color: marksMsg.startsWith('Error') ? '#e74c3c' : '#27ae60' }}>
                      {marksMsg}
                    </span>
                  )}
                  <button className="td-btn-save" onClick={saveMarks} disabled={marksSaving}>
                    {marksSaving ? 'Saving...' : existingMarks.length > 0 ? 'Update Marks' : 'Save Marks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TIMETABLE TAB */}
        {activeTab === 'timetable' && (
          <div className="td-panel">
            <div className="td-panel-header">
              <h2>My Timetable</h2>
              <span className="td-badge">{DAYS[activeDay]}</span>
            </div>
            <div className="td-day-tabs">
              {DAY_SHORT.map((d, i) => (
                <button key={d} className={`td-day-btn ${activeDay === i ? 'active' : ''}`} onClick={() => setActiveDay(i)}>{d}</button>
              ))}
            </div>
            {todaySlots.length === 0 ? (
              <p className="td-empty">No classes on {DAYS[activeDay]}</p>
            ) : (
              <div className="td-tt-list">
                {todaySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(slot => (
                  <div key={slot.id} className="td-tt-slot">
                    <div className="td-tt-time">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</div>
                    <div className="td-tt-subject">{slot.subjects?.name || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAYROLL TAB */}
        {activeTab === 'payroll' && <PayrollTab teacherId={profile?.id} />}

        {/* LEAVE TAB */}
        {activeTab === 'leave' && <LeaveTab teacherId={profile?.id} />}

      </div>

      <AIChatBuddy teacherName={profile?.full_name?.split(' ')[0] || 'Teacher'} />
    </div>
  );
}
