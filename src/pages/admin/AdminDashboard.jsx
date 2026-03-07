import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './AdminDashboard.css';

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
        supabase.from('subjects').select('id, name, year, section, departments(name), profiles:teacher_id(full_name)'),
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
      {/* Header */}
      <header className="ad-header">
        <div className="ad-logo">Edu<span>Sync</span></div>
        <div className="ad-header-center">
          <span className="ad-role-badge">ADMIN</span>
        </div>
        <div className="ad-header-right">
          <span className="ad-name">{profile?.full_name || 'Admin'}</span>
          <button className="ad-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
      </header>

      {/* Stat Cards */}
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

      {/* Tab Nav */}
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

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="ad-grid-2">
            {/* Recent Announcements */}
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

            {/* Subjects overview */}
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Subjects</h2>
                <span className="ad-badge">{subjects.length} total</span>
              </div>
              <div className="ad-subjects-list">
                {subjects.map(s => (
                  <div key={s.id} className="ad-subject-row">
                    <div className="ad-subject-name">{s.name}</div>
                    <div className="ad-subject-meta">
                      <span>Year {s.year} · Sec {s.section}</span>
                      <span className="ad-muted">{s.profiles?.full_name || '—'}</span>
                    </div>
                  </div>
                ))}
                {subjects.length === 0 && <p className="ad-empty">No subjects.</p>}
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="ad-grid-2">
            {/* Students */}
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Students</h2>
                <span className="ad-badge">{students.length} total</span>
              </div>
              <table className="ad-table">
                <thead>
                  <tr><th>Roll No</th><th>Name</th><th>Dept</th><th>Year</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td><span className="ad-roll">{s.roll_number}</span></td>
                      <td>{s.profiles?.full_name || '—'}</td>
                      <td className="ad-muted">{s.departments?.name || '—'}</td>
                      <td>Y{s.year}-{s.section}</td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan={4} className="ad-empty">No students.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Teachers */}
            <div className="ad-panel">
              <div className="ad-panel-header">
                <h2>Teachers</h2>
                <span className="ad-badge">{teachers.length} total</span>
              </div>
              <table className="ad-table">
                <thead>
                  <tr><th>Emp Code</th><th>Name</th><th>Email</th><th>Dept</th></tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id}>
                      <td><span className="ad-roll">{t.employee_code}</span></td>
                      <td>{t.profiles?.full_name || '—'}</td>
                      <td className="ad-muted">{t.profiles?.email || '—'}</td>
                      <td className="ad-muted">{t.departments?.name || '—'}</td>
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan={4} className="ad-empty">No teachers.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DEPARTMENTS TAB */}
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
                  <input
                    type="text" placeholder="e.g. Information Technology"
                    value={deptName} onChange={e => setDeptName(e.target.value)}
                  />
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

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div className="ad-grid-2">
            {/* Create */}
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

            {/* List */}
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
    </div>
  );
}
