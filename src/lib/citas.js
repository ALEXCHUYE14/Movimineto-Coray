import { supabase } from './supabase'
import { hora12 } from '../utils/format'

// Si ya existe otra cita (no cancelada) el mismo día a la misma hora, pide
// confirmación. Devuelve true si se puede continuar.
// Si la verificación falla (p. ej. sin conexión), NO bloquea el guardado:
// el insert mostrará su propio error si realmente no hay conexión.
export async function confirmarCruceCita(fecha, hora) {
  if (!fecha || !hora) return true
  try {
    const { data, error } = await supabase.from('citas')
      .select('id, pacientes(nombres, apellidos)')
      .eq('fecha', fecha).eq('hora', hora)
      .neq('estado', 'Cancelada')
      .limit(3)
    if (error || !data?.length) return true
    const nombres = data
      .map(c => `${c.pacientes?.nombres || ''} ${c.pacientes?.apellidos || ''}`.trim() || 'otro paciente')
      .join(', ')
    return confirm(
      `Ya hay ${data.length === 1 ? 'una cita' : 'citas'} a las ${hora12(hora)} de ese día (${nombres}).\n\n` +
      '¿Deseas agendar de todos modos?'
    )
  } catch {
    return true
  }
}
