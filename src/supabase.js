import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://blwcudmeoclnsfeaezus.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsd2N1ZG1lb2NsbnNmZWFlenVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NTA5NzgsImV4cCI6MjA4ODEyNjk3OH0.Lw0n9nksqeuredEGqSs5DvEpvIF2EAswxJgbpiMJLNA'

export const supabase = createClient(supabaseUrl, supabaseKey)
