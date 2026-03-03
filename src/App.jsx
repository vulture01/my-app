import React, { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load tasks on initial page load
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading tasks:', error)
        setError('Failed to load tasks.')
      } else {
        setTasks(data || [])
      }

      setLoading(false)
    }

    fetchTasks()
  }, [])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    setError(null)

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title: newTaskTitle.trim(), is_complete: false }])
      .select()
      .single()

    if (error) {
      console.error('Error adding task:', error)
      setError('Failed to add task.')
      return
    }

    setTasks((prev) => [data, ...prev])
    setNewTaskTitle('')
  }

  const handleToggleComplete = async (task) => {
    setError(null)

    const { data, error } = await supabase
      .from('tasks')
      .update({ is_complete: !task.is_complete })
      .eq('id', task.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating task:', error)
      setError('Failed to update task.')
      return
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? data : t))
    )
  }

  const handleDeleteTask = async (taskId) => {
    setError(null)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      setError('Failed to delete task.')
      return
    }

    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        backgroundColor: '#0f172a',
        padding: '40px 16px',
        color: '#e5e7eb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#020617',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: '-0.03em',
          }}
        >
          Supabase Tasks
        </h1>
        <p
          style={{
            fontSize: 14,
            color: '#9ca3af',
            marginBottom: 20,
          }}
        >
          Tasks are loaded and saved in real-time with Supabase.
        </p>

        <form
          onSubmit={handleAddTask}
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <input
            type="text"
            placeholder="Add a new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.4)',
              backgroundColor: '#020617',
              color: '#e5e7eb',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: 'none',
              cursor: newTaskTitle.trim() ? 'pointer' : 'not-allowed',
              background: newTaskTitle.trim()
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'rgba(55,65,81,0.8)',
              color: '#020617',
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
            }}
          >
            Add
          </button>
        </form>

        {loading && (
          <div
            style={{
              fontSize: 14,
              color: '#9ca3af',
              marginBottom: 8,
            }}
          >
            Loading tasks...
          </div>
        )}

        {error && (
          <div
            style={{
              fontSize: 13,
              color: '#fecaca',
              backgroundColor: 'rgba(248,113,113,0.12)',
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        {tasks.length === 0 && !loading ? (
          <div
            style={{
              fontSize: 14,
              color: '#6b7280',
              padding: '12px 4px',
            }}
          >
            No tasks yet. Add one above.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {tasks.map((task) => (
              <li
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  padding: '10px 12px',
                  border: '1px solid rgba(31,41,55,0.9)',
                }}
              >
                <button
                  onClick={() => handleToggleComplete(task)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    flex: 1,
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      border: task.is_complete
                        ? 'none'
                        : '1px solid rgba(148,163,184,0.7)',
                      background: task.is_complete
                        ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                        : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: '#020617',
                      flexShrink: 0,
                    }}
                  >
                    {task.is_complete ? '✓' : ''}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      textDecoration: task.is_complete ? 'line-through' : 'none',
                      color: task.is_complete ? '#6b7280' : '#e5e7eb',
                    }}
                  >
                    {task.title}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  style={{
                    marginLeft: 8,
                    border: 'none',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#fca5a5',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App