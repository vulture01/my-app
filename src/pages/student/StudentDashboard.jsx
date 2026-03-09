import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import './StudentDashboard.css';
import { ThemeToggle } from '../../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getAttClass(pct) {
  if (pct >= 75) return 'good';
  if (pct >= 65) return 'warn';
  return 'danger';
}

function getGrade(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'S';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
}

function getGradeColor(grade) {
  switch (grade) {
    case 'S': return '#9b59b6';
    case 'A': return '#27ae60';
    case 'B': return '#f1c40f';
    case 'C': return '#e67e22';
    case 'D': return '#e74c3c';
    case 'F': return '#e74c3c';
    default:  return '#aaa';
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildAISummary(attendance, marks) {
  const warnings = [];
  const positives = [];
  const tags = [];

  if (attendance.length > 0) {
    const lowAtt = attendance.filter(a => a.percentage < 75);
    const criticalAtt = attendance.filter(a => a.percentage < 60);
    if (criticalAtt.length > 0) {
      warnings.push(`<strong>${criticalAtt.length} subject(s)</strong> below 60% — detention risk`);
      tags.push({ label: 'Attendance Critical', type: 'tag-warn' });
    } else if (lowAtt.length > 0) {
      warnings.push(`<strong>${lowAtt.length} subject(s)</strong> below 75% threshold`);
      tags.push({ label: 'Improve Attendance', type: 'tag-warn' });
    } else {
      positives.push('attendance is above 75% across all subjects');
      tags.push({ label: 'Attendance OK', type: 'tag-ok' });
    }
  }

  if (marks.length > 0) {
    const avgPct = Math.min(100, marks.reduce((sum, m) => sum + (m.score / m.max_score) * 100, 0) / marks.length);
    if (avgPct >= 80) {
      positives.push(`strong average score of <strong>${avgPct.toFixed(0)}%</strong>`);
      tags.push({ label: 'High Performer', type: 'tag-ok' });
    } else if (avgPct < 60) {
      warnings.push(`current average is only <strong>${avgPct.toFixed(0)}%</strong> — revision needed`);
      tags.push({ label: 'Study More', type: 'tag-info' });
    } else {
      tags.push({ label: `Avg ${avgPct.toFixed(0)}%`, type: 'tag-info' });
    }
  }

  let summary = '';
  if (warnings.length) summary += `Heads-up — ${warnings.join(' and ')}. `;
  if (positives.length) summary += `Your ${positives.join(' and ')}. `;
  if (!summary) summary = 'Everything looks on track. Keep up the consistent effort!';
  summary += ' Check your timetable and plan your week.';

  return { summary, tags };
}

function AIChatBuddy({ studentName, department, year }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi ${studentName}! I am your AI study buddy. Ask me anything about your subjects, exams, or studies!` }
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
            { role: 'system', content: `You are a helpful academic assistant for a ${department} student in Year ${year}. Keep responses concise and helpful.` },
            ...messages,
            userMsg
          ],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not respond.';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
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
        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
        boxShadow: '0 4px 20px rgba(232,64,64,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
      }}>
        {open ? 'X' : 'AI'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 999,
          width: 340, height: 460, background: '#1a1a2e',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid #2a2a3e', display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #e84040, #ff6b35)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Study Buddy</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Always here to help</div>
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
              padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [activeDay, setActiveDay] = useState(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6 ? 0 : day - 1;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) throw new Error('Session expired. Please log in again.');

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', user.id)
          .single();
        if (profileErr) throw profileErr;
        setStudent(profile);

        const { data: stuData } = await supabase
          .from('students')
          .select('roll_number, year, section, department_id, departments(name)')
          .eq('id', user.id)
          .single();
        setStudentDetails(stuData);

        const { data: attData, error: attErr } = await supabase
          .from('attendance')
          .select('status, subject_id, subjects(name)')
          .eq('student_id', user.id);
        if (attErr) throw attErr;

        const attMap = {};
        (attData || []).forEach(row => {
          const name = row.subjects?.name || row.subject_id;
          if (!attMap[name]) attMap[name] = { subject: name, present: 0, total: 0 };
          attMap[name].total += 1;
          if (row.status === 'present') attMap[name].present += 1;
        });
        setAttendance(Object.values(attMap).map(a => ({
          subject: a.subject,
          present_classes: a.present,
          total_classes: a.total,
          percentage: a.total > 0 ? Math.round((a.present / a.total) * 100) : 0,
        })));

        const { data: marksData, error: marksErr } = await supabase
          .from('marks')
          .select('subject_id, subjects(name), exam_type, score, max_score, grade_point, credits')
          .eq('student_id', user.id)
          .limit(10);
        if (marksErr) throw marksErr;
        setMarks((marksData || []).map(m => ({
          ...m,
          subject: m.subjects?.name || m.subject_id,
        })));

        const { data: ttData, error: ttErr } = await supabase
          .from('timetable')
          .select('day, start_time, end_time, subjects(name)')
          .order('day', { ascending: true });
        if (ttErr) throw ttErr;
        setTimetable((ttData || []).map(t => ({
          ...t,
          subject: t.subjects?.name || '—',
          teacher_name: t.subjects?.teacher_id || 'Faculty',
        })));

        const { data: annData, error: annErr } = await supabase
          .from('announcements')
          .select('id, title, created_at, profiles:posted_by(full_name)')
          .or('role_target.eq.student,role_target.eq.all')
          .order('created_at', { ascending: false })
          .limit(8);
        if (annErr) throw annErr;
        setAnnouncements(annData || []);

        // Arrears — only uncleared
        const { data: arrData } = await supabase
          .from('arrears')
          .select('subject_id, subjects(name), exam_type, cleared')
          .eq('student_id', user.id);
        setArrears((arrData || []).filter(a => !a.cleared));

        // Absent dates
        const { data: absData } = await supabase
          .from('attendance')
          .select('subject_id, subjects(name), date')
          .eq('student_id', user.id)
          .eq('status', 'absent')
          .order('date', { ascending: false });
        setAbsents(absData || []);

      } catch (err) {
        console.error('Dashboard load error:', err);
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const overallAttendance = useMemo(() => {
    if (!attendance.length) return null;
    return Math.round(attendance.reduce((s, a) => s + a.percentage, 0) / attendance.length);
  }, [attendance]);

  const avgScore = useMemo(() => {
    if (!marks.length) return null;
    return Math.round(marks.reduce((s, m) => s + (m.score / m.max_score) * 100, 0) / marks.length);
  }, [marks]);

  const cgpa = useMemo(() => {
    const valid = marks.filter(m => m.grade_point != null && m.credits != null);
    if (!valid.length) return null;
    const totalPoints = valid.reduce((s, m) => s + m.grade_point * m.credits, 0);
    const totalCredits = valid.reduce((s, m) => s + m.credits, 0);
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : null;
  }, [marks]);

  const todaySlots = useMemo(
    () => timetable.filter(s => s.day === DAYS[activeDay]),
    [timetable, activeDay]
  );

  const aiInsight = useMemo(() => buildAISummary(attendance, marks), [attendance, marks]);

  const absentsBySubject = useMemo(() => {
    const map = {};
    absents.forEach(a => {
      const name = a.subjects?.name || a.subject_id;
      if (!map[name]) map[name] = [];
      map[name].push(a.date);
    });
    return map;
  }, [absents]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="spinner" />
        <p style={{ fontFamily: 'Inter', fontSize: 14 }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="edu-dashboard">

      <header className="dash-header">
        <div className="dash-header-left">
          <h1>Edu<span>Sync</span></h1>
          <p>Welcome back, {student?.full_name?.split(' ')[0] || 'Student'}</p>
        </div>
        <div className="dash-header-center">
          <div className="badge">STUDENT</div>
        </div>
        <div className="dash-meta">
          <ThemeToggle />
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }} style={{ background: '#e84040', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Logout</button>
          <div>{studentDetails?.roll_number || student?.email}</div>
          <div>{studentDetails ? `${studentDetails.departments?.name || 'CS Dept'} · Year ${studentDetails.year} · Sec ${studentDetails.section}` : ''}</div>
        </div>
      </header>

      {error && <div className="dash-error">{error}</div>}

      {/* Arrears Banner */}
      {arrears.length > 0 ? (
        <div style={{
          background: 'rgba(230,126,34,0.12)', border: '1px solid #e67e22',
          borderRadius: 10, padding: '12px 18px', margin: '0 0 16px 0'
        }}>
          <div style={{ color: '#e67e22', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            Arrear Alert — {arrears.length} subject(s) pending
          </div>
          {arrears.map((a, i) => (
            <div key={i} style={{ color: '#f0a060', fontSize: 13, marginTop: 3 }}>
              {a.subjects?.name || a.subject_id} &mdash; {a.exam_type}
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          background: 'rgba(39,174,96,0.1)', border: '1px solid #27ae60',
          borderRadius: 10, padding: '10px 18px', margin: '0 0 16px 0',
          color: '#27ae60', fontSize: 13, fontWeight: 600
        }}>
          No Arrears
        </div>
      )}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">ATT</span>
          <div className="stat-label">Overall Attendance</div>
          <div className={`stat-value ${getAttClass(overallAttendance)}`}>
            {overallAttendance !== null ? `${overallAttendance}%` : '—'}
          </div>
          <div className="stat-sub">{attendance.length} subjects tracked</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">MRK</span>
          <div className="stat-label">Average Score</div>
          <div className={`stat-value ${avgScore >= 75 ? 'good' : avgScore >= 60 ? 'warn' : 'danger'}`}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </div>
          <div className="stat-sub">{marks.length} assessments</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">CGPA</span>
          <div className="stat-label">CGPA</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {cgpa !== null ? cgpa : '—'}
          </div>
          <div className="stat-sub">Cumulative GPA</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">TT</span>
          <div className="stat-label">Today's Classes</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{todaySlots.length}</div>
          <div className="stat-sub">{DAYS[activeDay]}</div>
        </div>
      </div>

      <div className="dash-grid">

        <div className="card attendance-card">
          <div className="card-header">
            <h2 className="card-title">Attendance</h2>
            <span className="card-badge">{attendance.length} subjects</span>
          </div>
          {attendance.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No attendance data yet.</p>
          ) : (
            <div className="attendance-list">
              {attendance.map((a, i) => {
                const cls = getAttClass(a.percentage);
                return (
                  <div className="att-row" key={i}>
                    <div className="att-subject" title={a.subject}>{a.subject}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a.present_classes}/{a.total_classes}</div>
                    <div className={`att-pct ${cls}`}>{a.percentage}%</div>
                    <div className="att-bar-track">
                      <div className={`att-bar-fill ${cls}`} style={{ width: `${a.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card marks-card">
          <div className="card-header">
            <h2 className="card-title">Marks</h2>
            <span className="card-badge">Recent</span>
          </div>
          {marks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No marks recorded yet.</p>
          ) : (
            <div className="marks-list">
              {marks.map((m, i) => {
                const grade = getGrade(m.score, m.max_score);
                const gradeColor = getGradeColor(grade);
                return (
                  <div className="mark-row" key={i}>
                    <div className="mark-left">
                      <div className="mark-subject">{m.subject}</div>
                      <div className="mark-exam">{m.exam_type}</div>
                    </div>
                    <div className="mark-score-wrap">
                      <div className="mark-score" style={{ color: gradeColor }}>
                        {m.score}<span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/{m.max_score}</span>
                      </div>
                      <span style={{
                        background: gradeColor, color: '#fff',
                        padding: '2px 10px', borderRadius: 999,
                        fontSize: 12, fontWeight: 700
                      }}>{grade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card timetable-card">
          <div className="card-header">
            <h2 className="card-title">Timetable</h2>
            <span className="card-badge">{DAYS[activeDay]}</span>
          </div>
          <div className="days-tabs">
            {DAYS.map((day, i) => (
              <button
                key={i}
                className={`day-tab ${activeDay === i ? 'active' : ''}`}
                onClick={() => setActiveDay(i)}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          {todaySlots.length === 0 ? (
            <div className="no-class">No classes on {DAYS[activeDay]}</div>
          ) : (
            <div className="timetable-slots">
              {todaySlots.map((slot, i) => (
                <div className={`slot-card color-${i % 6}`} key={i}>
                  <div className="slot-time">{slot.start_time} – {slot.end_time}</div>
                  <div className="slot-subject">{slot.subject}</div>
                  <div className="slot-teacher">{slot.teacher_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="right-col">
          <div className="card announcements-card">
            <div className="card-header">
              <h2 className="card-title">Announcements</h2>
            </div>
            {announcements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No announcements.</p>
            ) : (
              <div className="ann-list">
                {announcements.map((a) => (
                  <div className="ann-item priority-low" key={a.id}>
                    <div className="ann-title">{a.title}</div>
                    <div className="ann-meta">
                      <span>{a.profiles?.full_name || 'Admin'}</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card ai-card">
            <div className="card-header">
              <h2 className="card-title">AI Status</h2>
            </div>
            <div className="ai-pulse">
              <div className="ai-dot" />
              <span className="ai-status-text">Analysis Ready</span>
            </div>
            <p className="ai-summary" dangerouslySetInnerHTML={{ __html: aiInsight.summary }} />
            <div className="ai-tags">
              {aiInsight.tags.map((t, i) => (
                <span className={`ai-tag ${t.type}`} key={i}>{t.label}</span>
              ))}
            </div>
          </div>

          {/* Absent Details */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Absent Details</h2>
              <span className="card-badge">{absents.length} records</span>
            </div>
            {Object.keys(absentsBySubject).length === 0 ? (
              <p style={{ color: '#27ae60', fontSize: 13, fontWeight: 600 }}>No Absences Recorded</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(absentsBySubject).map(([subject, dates], i) => (
                  <div key={i}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{subject}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dates.map((d, j) => (
                        <span key={j} style={{
                          background: 'rgba(231,76,60,0.15)', color: '#e74c3c',
                          borderRadius: 6, padding: '2px 8px', fontSize: 12
                        }}>
                          {new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <AIChatBuddy
        studentName={student?.full_name?.split(' ')[0] || 'Student'}
        department={studentDetails?.departments?.name || 'BCA'}
        year={studentDetails?.year || 2}
      />
    </div>
  );
}
