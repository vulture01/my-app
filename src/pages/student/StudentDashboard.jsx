import { useEffect, useState, useMemo, useRef } from 'react';
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



// ── COURSE LOG MODAL ──────────────────────────────────────────────────────────
function CourseLogModal({ subject, subjectId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('course_logs')
        .select('id, topic, description, taught_on')
        .eq('subject_id', subjectId)
        .order('taught_on', { ascending: false });
      setLogs(data || []);
      setLoading(false);
    }
    load();
  }, [subjectId]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border)',
          width: '100%', maxWidth: 560, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 16 }}>{subject}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>Course Log — What was taught</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--card-bg-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', padding: '6px 14px', fontSize: 13 }}
          >
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</p>
          ) : logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No course logs available for this subject yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#e84040', border: '2px solid var(--border)', marginTop: 4, flexShrink: 0 }} />
                    {i < logs.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 32 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>{log.topic}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 10 }}>
                        {new Date(log.taught_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    {log.description && (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, background: 'var(--card-bg-2)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--border)' }}>
                        {log.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
          {logs.length} session(s) logged · Read only view
        </div>
      </div>
    </div>
  );
}

// ── AI CHAT BUDDY ─────────────────────────────────────────────────────────────
function AIChatBuddy({ studentName, department, year, attendance = [], marks = [], arrears = [], hallTickets = [] }) {
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
            { role: 'system', content: `You are a helpful academic assistant for ${studentName}, a ${department} student in Year ${year} at Studyology. Keep responses concise and helpful. Always refer to the platform as Studyology.

Student context:
- Attendance: ${attendance.map(a => `${a.subject} ${a.percentage}%`).join(', ') || 'No data'}
- Low attendance subjects (below 75%): ${attendance.filter(a => a.percentage < 75).map(a => a.subject).join(', ') || 'None'}
- Marks: ${marks.map(m => `${m.subject} ${m.exam_type} ${m.score}/${m.max_score} (${Math.round((m.score/m.max_score)*100)}%)`).join(', ') || 'No data'}
- Arrears: ${arrears.length > 0 ? arrears.map(a => a.subjects?.name).join(', ') : 'None'}
- Upcoming exams: ${hallTickets.length > 0 ? hallTickets.map(h => `${h.exams?.title} on ${h.exams?.exam_date}`).join(', ') : 'None'}

Use this context to give personalized advice. If asked about detention risk, check attendance below 60%. IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%). IMPORTANT: When comparing marks or finding lowest/highest scores, always compare by PERCENTAGE not raw score. For example 32/50 (64%) is lower than 37/50 (74%).` },
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
        {open ? '✕' : '🤖'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>AI Study Buddy</div>
              </div>
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

// ── ATTENDANCE HEATMAP ────────────────────────────────────────────────────────
function AttendanceHeatmap({ absents }) {
  const today = new Date();

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 83);
  const dayOfWeek = startDate.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + offset);

  const dateMap = {};
  absents.forEach(a => {
    const d = a.date;
    dateMap[d] = (dateMap[d] || 0) + 1;
  });

  const cells = [];
  for (let i = 0; i < 84; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const count = dateMap[iso] || 0;
    const isFuture = d > today;
    cells.push({ iso, isWeekend, count, isFuture, date: d });
  }

  const weeks = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  const monthLabels = weeks.map((week, wi) => {
    const firstDay = week[0].date;
    const prevWeekFirst = wi > 0 ? weeks[wi - 1][0].date : null;
    if (wi === 0 || (prevWeekFirst && firstDay.getMonth() !== prevWeekFirst.getMonth())) {
      return firstDay.toLocaleString('default', { month: 'short' });
    }
    return '';
  });

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function getCellColor(cell) {
    if (cell.isFuture || cell.isWeekend) return 'var(--card-bg-2)';
    if (cell.count === 0) return 'rgba(39,174,96,0.55)';
    if (cell.count === 1) return 'rgba(231,76,60,0.65)';
    if (cell.count === 2) return 'rgba(231,76,60,0.82)';
    return '#e74c3c';
  }

  function getCellTitle(cell) {
    if (cell.isFuture) return cell.iso + ': Future';
    if (cell.isWeekend) return cell.iso + ': Weekend';
    if (cell.count === 0) return cell.iso + ': Present';
    return cell.iso + ': ' + cell.count + ' absence' + (cell.count > 1 ? 's' : '');
  }

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Month labels */}
      <div style={{ display: 'flex', gap: 3, marginLeft: 36, marginBottom: 4 }}>
        {weeks.map((_, wi) => (
          <div key={wi} style={{ width: 14, fontSize: 9, color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap' }}>
            {monthLabels[wi]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ height: 14, fontSize: 9, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', width: 28 }}>{d}</div>
          ))}
        </div>

        {/* Week columns */}
        <div style={{ display: 'flex', gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={getCellTitle(cell)}
                  style={{
                    width: 14, height: 14,
                    borderRadius: 3,
                    background: getCellColor(cell),
                    cursor: cell.isFuture || cell.isWeekend ? 'default' : 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, marginLeft: 36, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--card-bg-2)', label: 'No Data' },
          { color: 'rgba(39,174,96,0.55)', label: 'Present' },
          { color: 'rgba(231,76,60,0.65)', label: '1 Absence' },
          { color: 'rgba(231,76,60,0.82)', label: '2 Absences' },
          { color: '#e74c3c', label: '3+ Absences' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: l.color, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [arrears, setArrears] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [subjectIdMap, setSubjectIdMap] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
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
        const idMap = {};
        (attData || []).forEach(row => {
          const name = row.subjects?.name || row.subject_id;
          if (!attMap[name]) attMap[name] = { subject: name, present: 0, total: 0 };
          attMap[name].total += 1;
          if (row.status === 'present') attMap[name].present += 1;
          idMap[name] = row.subject_id;
        });
        setSubjectIdMap(idMap);
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

        const { data: arrData } = await supabase
          .from('arrears')
          .select('subject_id, subjects(name), exam_type, cleared')
          .eq('student_id', user.id);
        setArrears((arrData || []).filter(a => !a.cleared));

        const { data: htData } = await supabase
          .from('hall_tickets')
          .select('id, seat_number, hall_number, issued, exams(title, exam_type, exam_date, start_time, end_time, hall, subjects(name))')
          .eq('student_id', user.id);
        setHallTickets(htData || []);

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

  const [aiInsight, setAiInsight] = useState({ summary: 'Analyzing your academic data...', tags: [] });
  const [aiLoading, setAiLoading] = useState(false);
  const aiCalledRef = useRef(false);

  useEffect(() => {
    if (!attendance.length || aiCalledRef.current) return;
    aiCalledRef.current = true;
    setAiLoading(true);

    const prompt = `You are an academic advisor for a student at Studyology. Analyze this data and give a 2-sentence personalized summary.

Attendance: ${attendance.map(a => `${a.subject} ${a.percentage}%`).join(', ')}
Marks: ${marks.map(m => `${m.subject} ${m.exam_type} ${m.score}/${m.max_score} (${Math.round((m.score/m.max_score)*100)}%)`).join(', ')}

End your response with a new line: TAGS: tag1, tag2, tag3
Each tag must be one of: Attendance OK, Attendance Critical, Improve Attendance, High Performer, Study More, On Track, Needs Focus
Only output the summary + TAGS line. Nothing else.`;

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })
    })
    .then(r => r.json())
    .then(data => {
      const text = data.choices?.[0]?.message?.content || '';
      const [summaryPart, tagsPart] = text.split('TAGS:');
      const summary = summaryPart?.trim() || text;
      const tagLabels = tagsPart ? tagsPart.split(',').map(t => t.trim()).filter(Boolean) : [];
      const tagTypeMap = {
        'Attendance OK': 'tag-ok',
        'Attendance Critical': 'tag-warn',
        'Improve Attendance': 'tag-warn',
        'High Performer': 'tag-ok',
        'Study More': 'tag-info',
        'On Track': 'tag-ok',
        'Needs Focus': 'tag-warn',
      };
      const tags = tagLabels.map(label => ({ label, type: tagTypeMap[label] || 'tag-info' }));
      setAiInsight({ summary, tags });
    })
    .catch(() => setAiInsight({ summary: 'Could not load AI analysis. Check your connection.', tags: [] }))
    .finally(() => setAiLoading(false));
  }, [attendance, marks]);

  const absentsBySubject = useMemo(() => {
    const map = {};
    absents.forEach(a => {
      const name = a.subjects?.name || a.subject_id;
      if (!map[name]) map[name] = new Set();
      map[name].add(a.date); // Set automatically removes duplicates
    });
    // Convert Sets back to sorted arrays
    return Object.fromEntries(
      Object.entries(map).map(([k, v]) => [k, [...v].sort((a, b) => b.localeCompare(a))])
    );
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

      {/* Course Log Modal */}
      {selectedSubject && (
        <CourseLogModal
          subject={selectedSubject}
          subjectId={selectedSubjectId}
          onClose={() => { setSelectedSubject(null); setSelectedSubjectId(null); }}
        />
      )}

      <header className="dash-header">
        <div className="dash-header-left">
          <h1>Study<span>ology</span></h1>
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

        {/* ATTENDANCE + COURSE LOG */}
        <div className="card attendance-card">
          <div className="card-header">
            <h2 className="card-title">Attendance</h2>
            <span className="card-badge">{attendance.length} subjects</span>
          </div>
          {attendance.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No attendance data yet.</p>
          ) : (
            <>
              <div className="attendance-list">
                {attendance.map((a, i) => {
                  const cls = getAttClass(a.percentage);
                  return (
                    <div className="att-row" key={i}>
                      <div
                        className="att-subject"
                        title="Click to view course log"
                        onClick={() => { setSelectedSubject(a.subject); setSelectedSubjectId(subjectIdMap[a.subject]); }}
                        style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}
                      >
                        {a.subject}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{a.present_classes}/{a.total_classes}</div>
                      <div className={`att-pct ${cls}`}>{a.percentage}%</div>
                      <div className="att-bar-track">
                        <div className={`att-bar-fill ${cls}`} style={{ width: `${a.percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--card-bg-2)', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e84040', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  Click any subject name to view the course log — what was taught each session
                </span>
              </div>
            </>
          )}
        </div>

        {/* MARKS */}
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

        {/* TIMETABLE */}
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

          {/* ANNOUNCEMENTS */}
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

          {/* AI STATUS */}
          <div className="card ai-card">
            <div className="card-header">
              <h2 className="card-title">AI Status</h2>
            </div>
            <div className="ai-pulse">
              <div className="ai-dot" />
              <span className="ai-status-text">{aiLoading ? 'Analyzing...' : 'Analysis Ready'}</span>
            </div>
            {aiLoading ? (
              <div style={{ background: 'var(--card-bg-2)', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 6, width: '90%' }} />
                <div style={{ height: 12, background: 'var(--border)', borderRadius: 4, width: '70%' }} />
              </div>
            ) : (
              <p className="ai-summary">{aiInsight.summary}</p>
            )}
            <div className="ai-tags">
              {aiInsight.tags.map((t, i) => (
                <span className={`ai-tag ${t.type}`} key={i}>{t.label}</span>
              ))}
            </div>
          </div>

 {/* HALL TICKETS */}
          {(() => {
            const EXAM_SCHEDULE = [
              { subject: 'Computer Networks',  date: '2026-03-20' },
              { subject: 'Web Technologies',   date: '2026-03-23' },
              { subject: 'Data Structures',    date: '2026-03-26' },
              { subject: 'Operating Systems',  date: '2026-03-29' },
              { subject: 'Database Management',date: '2026-04-01' },
            ];
            const today = new Date();
            today.setHours(0,0,0,0);

            const withCountdown = EXAM_SCHEDULE.map((e, i) => {
              const examDate = new Date(e.date);
              const diff = Math.ceil((examDate - today) / 86400000);
              return { ...e, diff, examDate, isFirst: i === 0 };
            }).sort((a, b) => a.diff - b.diff);

            const urgencyColor = (diff) => {
              if (diff <= 3) return '#e74c3c';
              if (diff <= 7) return '#e67e22';
              return '#27ae60';
            };

            return (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Hall Tickets</h2>
                  <span className="card-badge">Final Exams · 09:00–12:00</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {withCountdown.map((exam, i) => {
                    const color = urgencyColor(exam.diff);
                    const isNext = i === 0;
                    return (
                      <div key={i} style={{
                        background: 'var(--card-bg-2)',
                        border: `1px solid ${isNext ? color : 'var(--border)'}`,
                        borderLeft: `4px solid ${color}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 14 }}>{exam.subject}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Final Examination</div>
                              {isNext && (
                                <div style={{
                                  background: color, color: '#fff',
                                  fontSize: 10, fontWeight: 700,
                                  borderRadius: 4, padding: '2px 8px'
                                }}>
                                  STUDY THIS FIRST
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{
                            background: `${color}22`, color: color,
                            borderRadius: 8, padding: '4px 10px',
                            fontSize: 13, fontWeight: 700,
                            minWidth: 70, textAlign: 'center'
                          }}>
                            {exam.diff > 0 ? `${exam.diff}d left` : exam.diff === 0 ? 'Today!' : 'Done'}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 10px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>DATE</div>
                            <div style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600 }}>
                              {exam.examDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '6px 10px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>TIME</div>
                            <div style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600 }}>09:00 – 12:00</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {/* ATTENDANCE HEATMAP + ABSENT DETAILS */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Attendance Heatmap</h2>
              <span className="card-badge">{absents.length} records</span>
            </div>
            {Object.keys(absentsBySubject).length === 0 ? (
              <p style={{ color: '#27ae60', fontSize: 13, fontWeight: 600 }}>No Absences Recorded</p>
            ) : (
              <>
                <AttendanceHeatmap absents={absents} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, marginTop: 4, fontWeight: 600 }}>All Absent Dates</div>
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
              </>
            )}
          </div>

        </div>
      </div>

      <AIChatBuddy
        studentName={student?.full_name?.split(' ')[0] || 'Student'}
        department={studentDetails?.departments?.name || 'BCA'}
        year={studentDetails?.year || 2}
        attendance={attendance}
        marks={marks}
        arrears={arrears}
        hallTickets={hallTickets}
      />
    </div>
  );
}
