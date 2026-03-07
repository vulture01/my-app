import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import './StudentDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getAttClass(pct) {
  if (pct >= 75) return 'good';
  if (pct >= 60) return 'warn';
  return 'danger';
}

function getGrade(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'S';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  return 'C';
}

function getMarkColor(score, maxScore) {
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return 'var(--accent-2)';
  if (pct >= 75) return 'var(--accent)';
  if (pct >= 60) return 'var(--accent-warn)';
  return 'var(--accent-3)';
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
      tags.push({ label: '⚠ Attendance Critical', type: 'tag-warn' });
    } else if (lowAtt.length > 0) {
      warnings.push(`<strong>${lowAtt.length} subject(s)</strong> below 75% threshold`);
      tags.push({ label: '⚡ Improve Attendance', type: 'tag-warn' });
    } else {
      positives.push('attendance is above 75% across all subjects');
      tags.push({ label: '✓ Attendance OK', type: 'tag-ok' });
    }
  }

  if (marks.length > 0) {
    const avgPct = marks.reduce((sum, m) => sum + (m.score / m.max_score) * 100, 0) / marks.length;
    if (avgPct >= 80) {
      positives.push(`strong average score of <strong>${avgPct.toFixed(0)}%</strong>`);
      tags.push({ label: '🎯 High Performer', type: 'tag-ok' });
    } else if (avgPct < 60) {
      warnings.push(`current average is only <strong>${avgPct.toFixed(0)}%</strong> — revision needed`);
      tags.push({ label: '📚 Study More', type: 'tag-info' });
    } else {
      tags.push({ label: `📊 Avg ${avgPct.toFixed(0)}%`, type: 'tag-info' });
    }
  }

  let summary = '';
  if (warnings.length) summary += `Heads-up — ${warnings.join(' and ')}. `;
  if (positives.length) summary += `Your ${positives.join(' and ')}. `;
  if (!summary) summary = 'Everything looks on track. Keep up the consistent effort!';
  summary += ' Check your timetable and plan your week.';

  return { summary, tags };
}

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
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

        // Profile
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', user.id)
          .single();
        if (profileErr) throw profileErr;
        setStudent(profile);

        // Student details
        const { data: stuData } = await supabase
          .from('students')
          .select('roll_number, year, section, department_id, departments(name)')
          .eq('id', user.id)
          .single();
        setStudentDetails(stuData);

        // Attendance grouped by subject
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

        // Marks — uses score & max_score
        const { data: marksData, error: marksErr } = await supabase
          .from('marks')
          .select('subject_id, subjects(name), exam_type, score, max_score')
          .eq('student_id', user.id)
          .limit(10);
        if (marksErr) throw marksErr;
        setMarks((marksData || []).map(m => ({
          ...m,
          subject: m.subjects?.name || m.subject_id,
        })));

        // Timetable
        const { data: ttData, error: ttErr } = await supabase
          .from('timetable')
          .select('day, start_time, end_time, subjects(name)')
          .order('day', { ascending: true })
          ;
        if (ttErr) throw ttErr;
        setTimetable((ttData || []).map(t => ({
          ...t,
          subject: t.subjects?.name || '—',
          teacher_name: t.subjects?.teacher_id || 'Faculty',
        })));

        // Announcements
        const { data: annData, error: annErr } = await supabase
          .from('announcements')
          .select('id, title, posted_by, created_at')
          .or('role_target.eq.student,role_target.eq.all')
          .order('created_at', { ascending: false })
          .limit(8);
        if (annErr) throw annErr;
        setAnnouncements(annData || []);

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

  const todaySlots = useMemo(
    () => timetable.filter(s => s.day === ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][activeDay]),
    [timetable, activeDay]
  );

  const aiInsight = useMemo(() => buildAISummary(attendance, marks), [attendance, marks]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="spinner" />
        <p style={{ fontFamily: 'Inter', fontSize: 14 }}>Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="edu-dashboard">

      <header className="dash-header">
        <div className="dash-header-left">
          <h1>Edu<span>Sync</span></h1>
          <p>Welcome back, {student?.full_name?.split(' ')[0] || 'Student'} 👋</p>
        </div>
        <div className="dash-meta">
          <div className="badge">Student</div>
          <div>{studentDetails?.roll_number || student?.email}</div>
          <div>{studentDetails ? `${studentDetails.departments?.name || ''} · Year ${studentDetails.year} · Sec ${studentDetails.section}` : ''}</div>
        </div>
      </header>

      {error && <div className="dash-error">⚠ {error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div className="stat-label">Overall Attendance</div>
          <div className={`stat-value ${getAttClass(overallAttendance)}`}>
            {overallAttendance !== null ? `${overallAttendance}%` : '—'}
          </div>
          <div className="stat-sub">{attendance.length} subjects tracked</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-label">Average Score</div>
          <div className={`stat-value ${avgScore >= 75 ? 'good' : avgScore >= 60 ? 'warn' : 'danger'}`}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </div>
          <div className="stat-sub">{marks.length} assessments</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🗓</span>
          <div className="stat-label">Today's Classes</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{todaySlots.length}</div>
          <div className="stat-sub">{DAYS[activeDay]}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📢</span>
          <div className="stat-label">Announcements</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{announcements.length}</div>
          <div className="stat-sub">{announcements.length} total</div>
        </div>
      </div>

      <div className="dash-grid">

        <div className="card attendance-card">
          <div className="card-header">
            <h2 className="card-title"><span className="icon">📅</span> Attendance</h2>
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
            <h2 className="card-title"><span className="icon">📊</span> Marks</h2>
            <span className="card-badge">Recent</span>
          </div>
          {marks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No marks recorded yet.</p>
          ) : (
            <div className="marks-list">
              {marks.map((m, i) => {
                const grade = getGrade(m.score, m.max_score);
                const color = getMarkColor(m.score, m.max_score);
                return (
                  <div className="mark-row" key={i}>
                    <div className="mark-left">
                      <div className="mark-subject">{m.subject}</div>
                      <div className="mark-exam">{m.exam_type}</div>
                    </div>
                    <div className="mark-score-wrap">
                      <div className="mark-score" style={{ color }}>
                        {m.score}<span style={{ color: 'var(--text-muted)', fontSize: 11 }}>/{m.max_score}</span>
                      </div>
                      <span className={`mark-grade-pill grade-${grade}`}>{grade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card timetable-card">
          <div className="card-header">
            <h2 className="card-title"><span className="icon">🗓</span> Timetable</h2>
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
            <div className="no-class">🎉 No classes on {DAYS[activeDay]}!</div>
          ) : (
            <div className="timetable-slots">
              {todaySlots.map((slot, i) => (
                <div className={`slot-card color-${i % 6}`} key={i}>
                  <div className="slot-time">{slot.start_time} – {slot.end_time}</div>
                  <div className="slot-subject">{slot.subject}</div>
                  <div className="slot-teacher">{slot.teacher_name}</div>
                  <div className="slot-room"></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="right-col">
          <div className="card announcements-card">
            <div className="card-header">
              <h2 className="card-title"><span className="icon">📢</span> Announcements</h2>
            </div>
            {announcements.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No announcements.</p>
            ) : (
              <div className="ann-list">
                {announcements.map((a) => (
                  <div className="ann-item priority-low" key={a.id}>
                    <div className="ann-title">{a.title}</div>
                    <div className="ann-meta">
                      <span>{a.posted_by}</span>
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card ai-card">
            <div className="card-header">
              <h2 className="card-title"><span className="icon">🤖</span> AI Status</h2>
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
        </div>

      </div>
    </div>
  );
}
