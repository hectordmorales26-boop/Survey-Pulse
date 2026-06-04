import { supabase } from './supabase';

const MOCK_CATEGORIES = [
  { id: 'cat-11111-1111-1111-1111-111111111111', name: 'Planificación', description: 'Planificación colaborativa de la demanda y capacidad productiva' },
  { id: 'cat-22222-2222-2222-2222-222222222222', name: 'Mejora Continua', description: 'Metodologías ágiles de feedback, retrospectivas y entregas iterativas' },
  { id: 'cat-33333-3333-3333-3333-333333333333', name: 'Roles', description: 'Organización del equipo, disponibilidad del PO, Scrum Master y facilitadores' },
  { id: 'cat-44444-4444-4444-4444-444444444444', name: 'Métricas', description: 'Mapeo de velocidad, cumplimiento de compromisos y calidad de código' },
  { id: 'cat-55555-5555-5555-5555-555555555555', name: 'Ingeniería', description: 'Integración continua, automatización de pruebas y despliegue rápido' }
];

/**
 * Lista las categorías principales de la cadena de suministro/diagnóstico.
 */
export async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('Category')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return { success: true, categories: data && data.length > 0 ? data : MOCK_CATEGORIES };
  } catch (err) {
    console.warn('Usando listado de categorías simulado:', err.message);
    return { success: true, categories: MOCK_CATEGORIES };
  }
}
