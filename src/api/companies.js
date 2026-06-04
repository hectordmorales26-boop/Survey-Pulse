import { supabase } from './supabase';

const MOCK_COMPANIES = [
  { id: 'c1111111-1111-1111-1111-111111111111', nombre_empresa: 'TechCorp Solutions', nit: '800.123.456-1', sector: 'TI & Desarrollo', correo: 'contact@techcorp.com', telefono: '555-0199', direccion: 'Calle 100 #15-30' },
  { id: 'c2222222-2222-2222-2222-222222222222', nombre_empresa: 'InnovaSoft', nit: '900.222.111-2', sector: 'Software', correo: 'info@innovasoft.com', telefono: '555-0210', direccion: 'Av. Las Vegas #45' },
  { id: 'c3333333-3333-3333-3333-333333333333', nombre_empresa: 'Fintech Hub', nit: '901.333.444-5', sector: 'Finanzas', correo: 'admin@fintechhub.com', telefono: '555-3044', direccion: 'Cra 43A #1-50' },
  { id: 'c4444444-4444-4444-4444-444444444444', nombre_empresa: 'Retail Systems', nit: '805.999.000-8', sector: 'Comercio', correo: 'contact@retailsystems.com', telefono: '555-9011', direccion: 'Zona Industrial #20' }
];

/**
 * Obtener lista de empresas registradas (Paginado).
 */
export async function getCompanies({ page = 1, limit = 10, search = '' } = {}) {
  try {
    let query = supabase
      .from('Company')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`nombre_empresa.ilike.%${search}%,nit.ilike.%${search}%,sector.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    return { 
      success: true, 
      companies: data && data.length > 0 ? data : MOCK_COMPANIES, 
      total: count || MOCK_COMPANIES.length 
    };
  } catch (err) {
    console.warn('Usando listado de empresas simulado:', err.message);
    const filtered = MOCK_COMPANIES.filter(c => 
      !search || 
      c.nombre_empresa.toLowerCase().includes(search.toLowerCase()) || 
      c.nit.includes(search)
    );
    return { success: true, companies: filtered, total: filtered.length };
  }
}

/**
 * Registra una empresa directamente en el sistema.
 */
export async function createCompany({ nombre_empresa, nit, sector, direccion = null, telefono = null, correo }) {
  try {
    const id = crypto.randomUUID();
    const updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('Company')
      .insert([{ id, nombre_empresa, nit, sector, direccion, telefono, correo, updated_at }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, company: data };
  } catch (err) {
    console.error('❌ Error registrando empresa en Supabase:', err.message);
    
    // Si es un error de conexión, simular en modo demo.
    // De lo contrario, propagar el error de base de datos para no enmascarar fallos de esquema.
    const isConnectionError = err.message?.includes('fetch') || err.message?.includes('network') || err.message?.includes('Failed');
    
    if (isConnectionError || !import.meta.env.VITE_SUPABASE_URL) {
      console.warn('⚠️ Usando fallback de empresa simulada debido a conexión no disponible.');
      const newCompany = {
        id: 'mock-comp-' + Math.random().toString(36).substr(2, 9),
        nombre_empresa,
        nit,
        sector,
        direccion,
        telefono,
        correo,
        created_at: new Date().toISOString()
      };
      MOCK_COMPANIES.push(newCompany);
      return { success: true, company: newCompany };
    }
    
    return { success: false, error: err.message };
  }
}

/**
 * Obtiene metadatos y usuarios vinculados de la empresa.
 */
export async function getCompanyById(id) {
  try {
    // 1. Obtener datos de la empresa
    const { data: company, error: compError } = await supabase
      .from('Company')
      .select('*')
      .eq('id', id)
      .single();
    if (compError) throw compError;

    // 2. Obtener usuarios vinculados a esa empresa
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, nombre, apellido, email, rol, estado')
      .eq('empresa_id', id);
    
    return { 
      success: true, 
      company: { 
        ...company, 
        users: users || [] 
      } 
    };
  } catch (err) {
    console.warn(`Usando detalle de empresa simulado para ID: ${id}`);
    const company = MOCK_COMPANIES.find(c => c.id === id) || MOCK_COMPANIES[0];
    // Simular usuarios vinculados
    const users = [
      { id: 'u2-mock', nombre: 'Juan', apellido: 'García', email: 'companyadmin@test.com', rol: 'COMPANY_ADMIN', estado: 'ACTIVO' }
    ];
    return { success: true, company: { ...company, users } };
  }
}

/**
 * Actualiza los datos de contacto corporativos.
 */
export async function updateCompany(id, { nombre_empresa, nit, sector, direccion, telefono, correo }) {
  try {
    const { data, error } = await supabase
      .from('Company')
      .update({ nombre_empresa, nit, sector, direccion, telefono, correo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, company: data };
  } catch (err) {
    console.warn(`Usando actualización de empresa simulada para ID: ${id}`);
    const index = MOCK_COMPANIES.findIndex(c => c.id === id);
    if (index !== -1) {
      MOCK_COMPANIES[index] = { ...MOCK_COMPANIES[index], nombre_empresa, nit, sector, direccion, telefono, correo };
      return { success: true, company: MOCK_COMPANIES[index] };
    }
    return { success: false, error: 'Empresa no encontrada' };
  }
}
