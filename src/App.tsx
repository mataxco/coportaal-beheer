import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Building2, Inbox, LogOut } from 'lucide-react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Kantoren from './pages/Kantoren'
import KantoorDetail from './pages/KantoorDetail'
import Aanvragen from './pages/Aanvragen'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isBeheerder, setIsBeheerder] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setIsBeheerder(null); return }
    supabase.rpc('is_beheerder').then(({ data }) => setIsBeheerder(!!data))
  }, [session])

  if (session === undefined) return null
  if (!session) return <Login />
  if (isBeheerder === null) return null
  if (!isBeheerder) {
    return (
      <div className="mx-auto mt-24 max-w-md card text-center">
        <p className="font-semibold text-navy-800">Geen toegang</p>
        <p className="mt-2 text-sm text-ink-600">{session.user.email} staat niet in de lijst van beheerders.</p>
        <button className="btn-secondary mt-4" onClick={() => supabase.auth.signOut()}>Uitloggen</button>
      </div>
    )
  }

  const nav = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium'
  return (
    <div className="min-h-screen">
      <header className="border-b border-navy-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-navy-900"><img src="/logo.svg" alt="" className="h-7" />Beheer</Link>
          <nav className="flex gap-1">
            <NavLink to="/" end className={({ isActive }) => `${nav} ${isActive ? 'bg-navy-50 text-navy-800' : 'text-ink-600 hover:bg-navy-50'}`}><Building2 className="h-4 w-4" />Kantoren</NavLink>
            <NavLink to="/aanvragen" className={({ isActive }) => `${nav} ${isActive ? 'bg-navy-50 text-navy-800' : 'text-ink-600 hover:bg-navy-50'}`}><Inbox className="h-4 w-4" />Aanvragen</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-600">
            {session.user.email}
            <button className="btn-secondary !px-2 !py-1.5" title="Uitloggen" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Routes>
          <Route path="/" element={<Kantoren />} />
          <Route path="/kantoor/:id" element={<KantoorDetail />} />
          <Route path="/aanvragen" element={<Aanvragen />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
