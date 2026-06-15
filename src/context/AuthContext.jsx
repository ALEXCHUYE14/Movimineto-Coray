import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil]   = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Usar onAuthStateChange con INITIAL_SESSION elimina la race condition
    // entre getSession() y el listener. INITIAL_SESSION se emite sincrónicamente
    // con la sesión almacenada en localStorage antes de cualquier refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, ses) => {
      setSession(ses)
      if (event === 'INITIAL_SESSION') setCargando(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setPerfil(null); return }
    let activo = true
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!activo || error) return
        setPerfil(data)
      })
    return () => { activo = false }
  }, [session])

  const login  = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const logout = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, perfil, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
