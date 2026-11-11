import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)
  const [eersteKeer, setEersteKeer] = useState(false)

  const inloggen = async (e: React.FormEvent) => {
    e.preventDefault(); setFout(null); setBezig(true)
    if (eersteKeer) {
      // Eerste inlog: account aanmaken. Toegang blijft beperkt tot de lijst van beheerders (RLS).
      const { error } = await supabase.auth.signUp({ email, password: wachtwoord })
      if (error) setFout(error.message)
      else setFout('Account aangemaakt. Als e-mailbevestiging aanstaat, klik dan eerst op de link in de mail en log daarna in.')
      setBezig(false); return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    if (error) setFout(error.message === 'Invalid login credentials' ? 'E-mailadres of wachtwoord klopt niet.' : error.message)
    setBezig(false)
  }
  const herstel = async () => {
    if (!email) { setFout('Vul eerst uw e-mailadres in.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin })
    setFout(error ? error.message : 'Er is een e-mail gestuurd om een wachtwoord in te stellen.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={inloggen} className="card w-full max-w-sm">
        <div className="flex items-center gap-2"><img src="/logo.svg" alt="" className="h-8" /><span className="font-bold text-navy-900">CoPortaal Beheer</span></div>
        <label className="label mt-6">E-mailadres</label>
        <input className="veld" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        <label className="label mt-4">Wachtwoord</label>
        <input className="veld" type="password" value={wachtwoord} onChange={e => setWachtwoord(e.target.value)} autoComplete="current-password" required />
        {fout && <p className="mt-3 rounded-lg bg-gold-100 px-3 py-2 text-sm text-navy-800">{fout}</p>}
        <button className="btn-primary mt-5 w-full" disabled={bezig}>{eersteKeer ? 'Account aanmaken' : 'Inloggen'}</button>
        <div className="mt-3 flex justify-between text-xs text-ink-400">
          <button type="button" className="hover:underline" onClick={() => setEersteKeer(!eersteKeer)}>{eersteKeer ? 'Ik heb al een account' : 'Eerste keer? Account aanmaken'}</button>
          <button type="button" className="hover:underline" onClick={herstel}>Wachtwoord vergeten</button>
        </div>
      </form>
    </div>
  )
}
