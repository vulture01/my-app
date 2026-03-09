import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import './TeacherDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function AIChatBuddy({ teacherName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${teacherName}! 👋 I'm your AI assistant. Ask me about lesson planning, student performance, or anything academic!` }
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
            { role: 'system', content: `You are a helpful assistant for a college teacher using EduSync. Help with lesson planning, attendance analysis, student performance, and academic queries. Be concise and professional.` },
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
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Teaching Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Here to help you teach better</div>
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
export default function TeacherDashboard() {
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [activeTab, setActiveTab] = useState('students');
  const [activeDay, setActiveDay] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceMsg, setAttendanceMsg] = useState('');

  // Marks state
  const [marksSubject, setMarksSubject] = useState(null);
  const [examType, setExamType] = useState('CAT1');
  const [marksMap, setMarksMap] = useState({});
  const [maxScore, setMaxScore] = useState(50);
  const [marksSaving, setMarksSaving] = useState(false);
  const [marksMsg, setMarksMsg] = useState('');

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
        .from('subjects')
        .select('id, name, year, section')
        .eq('teacher_id', user.id);
      setSubjects(subs || []);
      if (subs?.length) {
        setSelectedSubject(subs[0].id);
        setMarksSubject(subs[0].id);
      }

      const subIds = (subs || []).map(s => s.id);
      if (subIds.length) {
        const { data: studs } = await supabase
          .from('students')
          .select('id, roll_number, year, section, profiles(full_name, email)')
          .in('id', await getStudentIdsForSubjects(subIds));
        setStudents(studs || []);

        const init = {};
        (studs || []).forEach(s => { init[s.id] = 'present'; });
        setAttendanceMap(init);

        const marksInit = {};
        (studs || []).forEach(s => { marksInit[s.id] = ''; });
        setMarksMap(marksInit);
      }

      const { data: tt } = await supabase
        .from('timetable')
        .select('id, day, start_time, end_time, subjects(name)')
        .in('subject_id', subIds.length ? subIds : ['00000000-0000-0000-0000-000000000000']);
      setTimetable(tt || []);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function getStudentIdsForSubjects(subIds) {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('year', 2)
    .eq('section', 'A');
  return (data || []).map(s => s.id);
  } 

  async function saveAttendance() {
    if (!selectedSubject) return;
    setAttendanceSaving(true);
    setAttendanceMsg('');
    try {
      // Delete existing for same date+subject
      await supabase.from('attendance')
        .delete()
        .eq('subject_id', selectedSubject)
        .eq('date', attendanceDate);

      const rows = students.map(s => ({
        student_id: s.id,
        subject_id: selectedSubject,
        date: attendanceDate,
        status: attendanceMap[s.id] || 'present',
      }));
      const { error: e } = await supabase.from('attendance').insert(rows);
      if (e) throw e;
      setAttendanceMsg('✅ Attendance saved!');
    } catch (e) {
      setAttendanceMsg('❌ ' + e.message);
    } finally {
      setAttendanceSaving(false);
    }
  }

  async function saveMarks() {
    if (!marksSubject) return;
    setMarksSaving(true);
    setMarksMsg('');
    try {
      const rows = students
        .filter(s => marksMap[s.id] !== '' && marksMap[s.id] !== undefined)
        .map(s => ({
          student_id: s.id,
          subject_id: marksSubject,
          exam_type: examType,
          score: Number(marksMap[s.id]),
          max_score: maxScore,
          entered_by: profile?.id,
        }));

      // Upsert by deleting first
      for (const r of rows) {
        await supabase.from('marks')
          .delete()
          .eq('student_id', r.student_id)
          .eq('subject_id', r.subject_id)
          .eq('exam_type', r.exam_type);
      }
      const { error: e } = await supabase.from('marks').insert(rows);
      if (e) throw e;
      setMarksMsg('✅ Marks saved!');
    } catch (e) {
      setMarksMsg('❌ ' + e.message);
    } finally {
      setMarksSaving(false);
    }
  }

  if (loading) return <div className="td-loading"><div className="td-spinner" /><p>Loading...</p></div>;
  if (error) return <div className="td-error">⚠ {error}</div>;

  const todaySlots = timetable.filter(t => t.day === DAYS[activeDay]);
  const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length;

  return (
    <div className="td-root">
      {/* Header */}
      <header className="td-header">
        <div className="td-logo">Edu<span>Sync</span></div>
        <div className="td-header-center">
          <span className="td-role-badge">TEACHER</span>
        </div>
        <div className="td-header-right">
          <span className="td-name">{profile?.full_name || 'Teacher'}</span>
          <span className="td-emp">EMP: {profile?.employee_code || '—'}</span>
          <button className="td-logout" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}>Logout</button>
        </div>
      </header>

      {/* Stat Cards */}
      <div className="td-stats">
        <div className="td-stat-card">
          <span className="td-stat-icon">📚</span>
          <div className="td-stat-val">{subjects.length}</div>
          <div className="td-stat-label">SUBJECTS</div>
        </div>
        <div className="td-stat-card">
          <span className="td-stat-icon">👥</span>
          <div className="td-stat-val">{students.length}</div>
          <div className="td-stat-label">STUDENTS</div>
        </div>
        <div className="td-stat-card">
          <span className="td-stat-icon">🗓</span>
          <div className="td-stat-val">{todaySlots.length}</div>
          <div className="td-stat-label">TODAY'S CLASSES</div>
        </div>
        <div className="td-stat-card">
          <span className="td-stat-icon">✅</span>
          <div className="td-stat-val td-green">{students.length ? Math.round((presentCount / students.length) * 100) : 0}%</div>
          <div className="td-stat-label">PRESENT TODAY</div>
        </div>
      </div>

      {/* Tab Nav */}
      <nav className="td-tabs">
        {['students', 'attendance', 'marks', 'timetable'].map(tab => (
          <button
            key={tab}
            className={`td-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'students' && '👥 Students'}
            {tab === 'attendance' && '📋 Attendance'}
            {tab === 'marks' && '📊 Marks'}
            {tab === 'timetable' && '🗓 Timetable'}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="td-content">

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="td-panel">
            <div className="td-panel-header">
              <h2>Student List</h2>
              <span className="td-badge">{students.length} students</span>
            </div>
            {students.length === 0 ? (
              <p className="td-empty">No students found.</p>
            ) : (
              <table className="td-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Year</th>
                    <th>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id}>
                      <td>{i + 1}</td>
                      <td><span className="td-roll">{s.roll_number}</span></td>
                      <td>{s.profiles?.full_name || '—'}</td>
                      <td className="td-muted">{s.profiles?.email || '—'}</td>
                      <td>Year {s.year}</td>
                      <td>Sec {s.section}</td>
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
              <h2>Mark Attendance</h2>
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
                <span className="td-present-pill">✅ {presentCount} Present</span>
                <span className="td-absent-pill">❌ {students.length - presentCount} Absent</span>
              </div>
            </div>

            {students.length === 0 ? (
              <p className="td-empty">No students found.</p>
            ) : (
              <div className="td-att-list">
                <div className="td-att-actions">
                  <button className="td-btn-sm" onClick={() => {
                    const all = {}; students.forEach(s => all[s.id] = 'present');
                    setAttendanceMap(all);
                  }}>Mark All Present</button>
                  <button className="td-btn-sm td-btn-red" onClick={() => {
                    const all = {}; students.forEach(s => all[s.id] = 'absent');
                    setAttendanceMap(all);
                  }}>Mark All Absent</button>
                </div>
                {students.map(s => (
                  <div key={s.id} className={`td-att-row ${attendanceMap[s.id] === 'absent' ? 'absent' : 'present'}`}>
                    <div className="td-att-info">
                      <span className="td-att-roll">{s.roll_number}</span>
                      <span className="td-att-name">{s.profiles?.full_name || '—'}</span>
                    </div>
                    <div className="td-att-toggle">
                      <button
                        className={`td-toggle-btn ${attendanceMap[s.id] === 'present' ? 'active-green' : ''}`}
                        onClick={() => setAttendanceMap(m => ({ ...m, [s.id]: 'present' }))}
                      >P</button>
                      <button
                        className={`td-toggle-btn ${attendanceMap[s.id] === 'absent' ? 'active-red' : ''}`}
                        onClick={() => setAttendanceMap(m => ({ ...m, [s.id]: 'absent' }))}
                      >A</button>
                    </div>
                  </div>
                ))}
                <div className="td-save-row">
                  {attendanceMsg && <span className="td-msg">{attendanceMsg}</span>}
                  <button className="td-btn-save" onClick={saveAttendance} disabled={attendanceSaving}>
                    {attendanceSaving ? 'Saving...' : '💾 Save Attendance'}
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
              <h2>Enter Marks</h2>
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
                <input type="number" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} min={1} max={100} style={{width:'80px'}} />
              </div>
            </div>

            {students.length === 0 ? (
              <p className="td-empty">No students found.</p>
            ) : (
              <div className="td-marks-list">
                <div className="td-marks-header-row">
                  <span>Roll No</span>
                  <span>Name</span>
                  <span>Score / {maxScore}</span>
                  <span>Grade</span>
                </div>
                {students.map(s => {
                  const score = Number(marksMap[s.id]);
                  const pct = maxScore ? (score / maxScore) * 100 : 0;
                  const grade = pct >= 90 ? 'S' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'F';
                  const gradeColor = pct >= 90 ? '#4ade80' : pct >= 80 ? '#60a5fa' : pct >= 70 ? '#a78bfa' : pct >= 60 ? '#f59e0b' : '#f87171';
                  return (
                    <div key={s.id} className="td-marks-row">
                      <span className="td-roll">{s.roll_number}</span>
                      <span>{s.profiles?.full_name || '—'}</span>
                      <input
                        type="number"
                        className="td-marks-input"
                        placeholder="—"
                        min={0}
                        max={maxScore}
                        value={marksMap[s.id]}
                        onChange={e => setMarksMap(m => ({ ...m, [s.id]: e.target.value }))}
                      />
                      <span className="td-grade-pill" style={{ background: gradeColor + '22', color: gradeColor, border: `1px solid ${gradeColor}` }}>
                        {marksMap[s.id] !== '' ? grade : '—'}
                      </span>
                    </div>
                  );
                })}
                <div className="td-save-row">
                  {marksMsg && <span className="td-msg">{marksMsg}</span>}
                  <button className="td-btn-save" onClick={saveMarks} disabled={marksSaving}>
                    {marksSaving ? 'Saving...' : '💾 Save Marks'}
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
              <p className="td-empty">🎉 No classes on {DAYS[activeDay]}!</p>
            ) : (
              <div className="td-tt-list">
                {todaySlots.sort((a, b) => a.start_time.localeCompare(b.start_time)).map(slot => (
                  <div key={slot.id} className="td-tt-slot">
                    <div className="td-tt-time">{slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</div>
                    <div className="td-tt-subject">{slot.subjects?.name || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
      <AIChatBuddy teacherName={profile?.full_name?.split(' ')[0] || 'Teacher'} />
    </div>
  );
}
