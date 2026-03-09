import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('edu-theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    let applied = theme;
    if (theme === 'system') {
      applied = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', applied);
    localStorage.setItem('edu-theme', theme);
  }, [theme]);

  // Also listen to system changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Reusable toggle component used in all headers
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light' },
    { value: 'dark',  label: 'Dark'  },
    { value: 'system',label: 'Auto'  },
  ];
  return (
    <div style={{
      display: 'flex', gap: 2, background: 'var(--toggle-bg, rgba(255,255,255,0.08))',
      borderRadius: 8, padding: 3, border: '1px solid var(--border, #2a2a3e)'
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => setTheme(o.value)} style={{
          padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 600,
          background: theme === o.value ? '#e84040' : 'transparent',
          color: theme === o.value ? '#fff' : 'var(--text-muted, #aaa)',
          transition: 'all 0.15s'
        }}>{o.label}</button>
      ))}
    </div>
  );
}
