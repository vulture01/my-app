import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './AdminDashboard.css';
import { ThemeToggle } from '../../context/ThemeContext';
function AIChatBuddy({ adminName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${adminName}! 👋 I'm your AI admin assistant. Ask me about managing departments, students, announcements, or anything about EduSync!` }
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are a helpful assistant for a college admin using EduSync, an educational management system. Help with administrative tasks, department management, announcements, and institutional queries. Be concise and professional.` },
            ...messages,
            userMsg
          ],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not respond.';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch(e) {
      setMessages(m => [...m, { role: 'assistant', content: '❌ Error connecting. Try again!' }]);
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
      }}>
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 999,
          width: 340, height: 460, background: '#1a1a2e',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid #2a2a3e', display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
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
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: m.role === 'user' ? '#e84040' : '#2a2a3e',
                color: '#fff', borderRadius: 12, padding: '8px 12px', fontSize: 13, lineHeight: 1.5
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#2a2a3e', color: '#aaa', borderRadius: 12, padding: '8px 12px', fontSize: 13 }}>
                Thinking...
              </div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #2a2a3e', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask anything..."
              style={{
                flex: 1, background: '#2a2a3e', border: '1px solid #3a3a4e',
                borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none'
              }}
            />
            <button onClick={sendMessage} disabled={loading} style={{
              background: '#e84040', border: 'none', borderRadius: 8,
              padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 16
            }}>➤</button>
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

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('full_name, email, role').eq('id', user.id).single();
      setProfile({ ...prof, id: user.id });

      const [
        { count: sc }, { count: tc }, { count: dc }, { count: subc },
        { data: studs }, { data: tchs }, { data: depts }, { data: subs }, { data: anns }
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
      ]);

      setStats({ students: sc || 0, teachers: tc || 0, departments: dc || 0, subjects: subc || 0 });
      setStudents(studs || []);
      setTeachers(tchs || []);
      setDepartments(depts || []);
      setSubjects(subs || []);
      setAnnouncements(anns || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createAnnouncement() {
    if (!annTitle.trim()) return;
    setAnnSaving(true); setAnnMsg('');
    try {
      const { error: e } = await supabase.from('announcements').insert({
        title: annTitle, body: annBody,
        posted_by: profile.id, role_target: annTarget,
      });
      if (e) throw e;
      setAnnTitle(''); setAnnBody(''); setAnnTarget('all');
      setAnnMsg('✅ Announcement posted!');
      fetchAll();
    } catch (e) { setAnnMsg('❌ ' + e.message); }
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
      const { error: e1 } = await supabase.from('profiles').insert({
        id: newId, full_name: newStudentName.trim(),
        email: newStudentEmail.trim() || `${newStudentRoll.toLowerCase()}@edusync.com`,
        role: 'student'
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('students').insert({
        id: newId, department_id: newStudentDept,
        year: parseInt(newStudentYear), section: newStudentSection,
        roll_number: newStudentRoll.trim()
      });
      if (e2) throw e2;
      setStudentMsg('✅ Student added!');
      setNewStudentName(''); setNewStudentEmail(''); setNewStudentRoll('');
      setNewStudentYear('1'); setNewStudentSection('A'); setNewStudentDept('');
      setShowAddStudent(false);
      fetchAll();
    } catch(e) { setStudentMsg('❌ ' + e.message); }
  }

  async function deleteStudent(id) {
    if (!window.confirm('Delete this student?')) return;
    await supabase.from('students').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
    setStudents(s => s.filter(x => x.id !== id));
  }

  async function addTeacher() {
    if (!newTeacherName.trim() || !newTeacherEmpCode.trim() || !newTeacherDept) return;
    setTeacherMsg('');
    try {
      const newId = crypto.randomUUID();
      const { error: e1 } = await supabase.from('profiles').insert({
        id: newId, full_name: newTeacherName.trim(),
        email: newTeacherEmail.trim() || `${newTeacherEmpCode.toLowerCase()}@edusync.com`,
        role: 'teacher'
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('teachers').insert({
        id: newId, department_id: newTeacherDept,
        employee_code: newTeacherEmpCode.trim()
      });
      if (e2) throw e2;
      setTeacherMsg('✅ Teacher added!');
      setNewTeacherName(''); setNewTeacherEmail(''); setNewTeacherEmpCode(''); setNewTeacherDept('');
      setShowAddTeacher(false);
      fetchAll();
    } catch(e) { setTeacherMsg('❌ ' + e.message); }
  }

  async function deleteTeacher(id) {
    if (!window.confirm('Delete this teacher?')) return;
    await supabase.from('teachers').delete().eq('id', id);
    await supabase.from('profiles').delete().eq('id', id);
    setTeachers(t => t.filter(x => x.id !== id));
  }

  async function createDepartment() {
    if (!deptName.trim()) return;
    setDeptSaving(true); setDeptMsg('');
    try {
      const { error: e } = await supabase.from('departments').insert({ name: deptName });
      if (e) throw e;
      setDeptName(''); setDeptMsg('✅ Department created!');
      fetchAll();
    } catch (e) { setDeptMsg('❌ ' + e.message); }
    finally { setDeptSaving(false); }
  }

  async function deleteDepartment(id) {
    const { error: e } = await supabase.from('departments').delete().eq('id', id);
    if (!e) setDepartments(d => d.filter(x => x.id !== id));
  }

  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading) return <div className="ad-loading"><div className="ad-spinner" /><p>Loading...</p></div>;
  if (error) return <div className="ad-error">⚠ {error}</div>;

  return (
    <div className="ad-root">
      <header className="ad-header">
        <div className="ad-logo">Edu<span>Sync</span></div>
        <div className="ad-header-center"><span className="ad-role-badge">ADMIN</span></div>
        <div className="ad-header-right">
          <span className="ad-name">{profile?.full_name || 'Admin'}</span>
           <ThemeToggle />
          <button className="ad-logout" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Logout</button>
        </div>
      </header>

      <div className="ad-stats">
        {[
          { icon: '🏫', val: stats.departments, label: 'DEPARTMENTS' },
          { icon: '📚', val: stats.subjects, label: 'SUBJECTS' },
          { icon: '👨‍🏫', val: stats.teachers, label: 'TEACHERS' },
          { icon: '👥', val: stats.students, label: 'STUDENTS' },
        ].map(s => (
          <div className="ad-stat-card" key={s.label}>
            <span className="ad-stat-icon">{s.icon}</span>
            <div className="ad-stat-val">{s.val}</div>
            <div className="ad-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <nav className="ad-tabs">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'users', label: '👥 Users' },
          { id: 'departments', label: '🏫 Departments' },
          { id: 'announcements', label: '📢 Announcements' },
        ].map(t => (
          <button key={t.id} className={`ad-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ad-content">

        {activeTab === 'overview' && (
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
        )}

        {activeTab === 'users' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Students</h2>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className="ad-badge">{students.length} total</span>
                  <button style={{padding:'4px 14px',fontSize:12,background:'#e84040',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}} onClick={()=>setShowAddStudent(s=>!s)}>
                    {showAddStudent ? '✕ Cancel' : '+ Add'}
                  </button>
                </div>
              </div>
              {showAddStudent && (
                <div className="ad-form" style={{marginBottom:12}}>
                  <div className="ad-form-group">
                    <label>Full Name *</label>
                    <input placeholder="e.g. Arjun Kumar" value={newStudentName} onChange={e=>setNewStudentName(e.target.value)} />
                  </div>
                  <div className="ad-form-group">
                    <label>Email</label>
                    <input placeholder="auto-generated if empty" value={newStudentEmail} onChange={e=>setNewStudentEmail(e.target.value)} />
                  </div>
                  <div className="ad-form-group">
                    <label>Roll Number *</label>
                    <input placeholder="e.g. BCA2024007" value={newStudentRoll} onChange={e=>setNewStudentRoll(e.target.value)} />
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                    <div className="ad-form-group">
                      <label>Year</label>
                      <select value={newStudentYear} onChange={e=>setNewStudentYear(e.target.value)}>
                        {['1','2','3'].map(y=><option key={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label>Section</label>
                      <select value={newStudentSection} onChange={e=>setNewStudentSection(e.target.value)}>
                        {['A','B','C'].map(s=><option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ad-form-group">
                      <label>Department *</label>
                      <select value={newStudentDept} onChange={e=>setNewStudentDept(e.target.value)}>
                        <option value="">Select</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ad-form-footer">
                    {studentMsg && <span className="ad-msg">{studentMsg}</span>}
                    <button className="ad-btn-save" onClick={addStudent}>+ Add Student</button>
                  </div>
                </div>
              )}
              <table className="ad-table">
                <thead>
                  <tr><th>Roll No</th><th>Name</th><th>Dept</th><th>Year</th><th></th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td><span className="ad-roll">{s.roll_number}</span></td>
                      <td>{s.profiles?.full_name || '—'}</td>
                      <td className="ad-muted">{s.departments?.name || '—'}</td>
                      <td>Y{s.year}-{s.section}</td>
                      <td><button className="ad-btn-delete" onClick={()=>deleteStudent(s.id)}>🗑️</button></td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={5} className="ad-empty">No students.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Teachers</h2>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span className="ad-badge">{teachers.length} total</span>
                  <button style={{padding:'4px 14px',fontSize:12,background:'#e84040',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}} onClick={()=>setShowAddTeacher(s=>!s)}>
                    {showAddTeacher ? '✕ Cancel' : '+ Add'}
                  </button>
                </div>
              </div>
              {showAddTeacher && (
                <div className="ad-form" style={{marginBottom:12}}>
                  <div className="ad-form-group">
                    <label>Full Name *</label>
                    <input placeholder="e.g. Dr. Ravi Kumar" value={newTeacherName} onChange={e=>setNewTeacherName(e.target.value)} />
                  </div>
                  <div className="ad-form-group">
                    <label>Email</label>
                    <input placeholder="auto-generated if empty" value={newTeacherEmail} onChange={e=>setNewTeacherEmail(e.target.value)} />
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div className="ad-form-group">
                      <label>Employee Code *</label>
                      <input placeholder="e.g. TC004" value={newTeacherEmpCode} onChange={e=>setNewTeacherEmpCode(e.target.value)} />
                    </div>
                    <div className="ad-form-group">
                      <label>Department *</label>
                      <select value={newTeacherDept} onChange={e=>setNewTeacherDept(e.target.value)}>
                        <option value="">Select</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ad-form-footer">
                    {teacherMsg && <span className="ad-msg">{teacherMsg}</span>}
                    <button className="ad-btn-save" onClick={addTeacher}>+ Add Teacher</button>
                  </div>
                </div>
              )}
              <table className="ad-table">
                <thead>
                  <tr><th>Emp Code</th><th>Name</th><th>Email</th><th>Dept</th><th></th></tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id}>
                      <td><span className="ad-roll">{t.employee_code}</span></td>
                      <td>{t.profiles?.full_name || '—'}</td>
                      <td className="ad-muted">{t.profiles?.email || '—'}</td>
                      <td className="ad-muted">{t.departments?.name || '—'}</td>
                      <td><button className="ad-btn-delete" onClick={()=>deleteTeacher(t.id)}>🗑️</button></td>
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan={5} className="ad-empty">No teachers.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Departments</h2>
                <span className="ad-badge">{departments.length} total</span>
              </div>
              <div className="ad-dept-list">
                {departments.map(d => (
                  <div key={d.id} className="ad-dept-row">
                    <div className="ad-dept-info">
                      <span className="ad-dept-icon">🏫</span>
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
                <div className="ad-form-group">
                  <label>Department Name</label>
                  <input type="text" placeholder="e.g. Information Technology" value={deptName} onChange={e => setDeptName(e.target.value)} />
                </div>
                <div className="ad-form-footer">
                  {deptMsg && <span className="ad-msg">{deptMsg}</span>}
                  <button className="ad-btn-save" onClick={createDepartment} disabled={deptSaving}>
                    {deptSaving ? 'Creating...' : '+ Create Department'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="ad-grid-2">
            <div className="ad-panel">
              <div className="ad-panel-header"><h2>New Announcement</h2></div>
              <div className="ad-form">
                <div className="ad-form-group">
                  <label>Title</label>
                  <input type="text" placeholder="Announcement title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
                </div>
                <div className="ad-form-group">
                  <label>Message</label>
                  <textarea rows={4} placeholder="Write your message..." value={annBody} onChange={e => setAnnBody(e.target.value)} />
                </div>
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
                  <button className="ad-btn-save" onClick={createAnnouncement} disabled={annSaving}>
                    {annSaving ? 'Posting...' : '📢 Post Announcement'}
                  </button>
                </div>
              </div>
            </div>
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>All Announcements</h2>
                <span className="ad-badge">{announcements.length}</span>
              </div>
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

      </div>
      <AIChatBuddy adminName={profile?.full_name?.split(' ')[0] || 'Admin'} />
    </div>
  );
}
