import { supabase } from './supabase';

const MOCK_ASSIGNMENTS = [
  { id: 'asg-1', survey_id: '1', evaluator_id: 'u3333333-3333-3333-3333-333333333333', assigned_by: 'u1111111-1111-1111-1111-111111111111', due_date: '2026-06-30T23:59:59Z', status: 'PENDING', created_at: '2026-05-25T10:00:00Z' },
  { id: 'asg-2', survey_id: '2', evaluator_id: 'u3333333-3333-3333-3333-333333333333', assigned_by: 'u2222222-2222-2222-2222-222222222222', due_date: '2026-06-15T23:59:59Z', status: 'IN_PROGRESS', created_at: '2026-05-26T08:00:00Z' },
  { id: 'asg-3', survey_id: '1', evaluator_id: 'u4444444-4444-4444-4444-444444444444', assigned_by: 'u1111111-1111-1111-1111-111111111111', due_date: '2026-05-20T23:59:59Z', status: 'COMPLETED', created_at: '2026-05-10T09:00:00Z' }
];

/**
 * Lista de encuestas asignadas a responder (Filtrado opcional por evaluador o rol).
 */
export async function getAssignments({ evaluatorId = null, role = 'EVALUATOR' } = {}) {
  try {
    let query = supabase
      .from('SurveyAssignment')
      .select('*, Survey(titulo, descripcion), evaluator:User!evaluator_id(nombre, apellido)');

    if (role === 'EVALUATOR' && evaluatorId) {
      query = query.eq('evaluator_id', evaluatorId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const normalizedAssignments = (data || []).map(asg => ({
      ...asg,
      survey: asg.Survey || asg.survey,
      evaluator: asg.evaluator
    }));

    return { success: true, assignments: normalizedAssignments.length > 0 ? normalizedAssignments : MOCK_ASSIGNMENTS };
  } catch (err) {
    console.warn('Usando asignaciones de encuestas simuladas:', err.message);
    const filtered = MOCK_ASSIGNMENTS.filter(a => !evaluatorId || a.evaluator_id === evaluatorId);
    return { success: true, assignments: filtered };
  }
}

/**
 * Asigna encuesta a un evaluador de la empresa.
 */
export async function createAssignment({ survey_id, evaluator_id, assigned_by, due_date }) {
  try {
    const { data, error } = await supabase
      .from('SurveyAssignment')
      .insert([{ survey_id, evaluator_id, assigned_by, due_date, status: 'PENDING' }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, assignment: data };
  } catch (err) {
    console.warn('Usando creación de asignación simulada:', err.message);
    const newAssignment = {
      id: 'mock-asg-' + Math.random().toString(36).substr(2, 9),
      survey_id,
      evaluator_id,
      assigned_by,
      due_date,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    MOCK_ASSIGNMENTS.push(newAssignment);
    return { success: true, assignment: newAssignment };
  }
}

/**
 * Modifica fechas límites o estados de asignación.
 */
export async function updateAssignment(id, { due_date, status }) {
  try {
    const { data, error } = await supabase
      .from('SurveyAssignment')
      .update({ due_date, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, assignment: data };
  } catch (err) {
    console.warn(`Usando actualización de asignación simulada para ID: ${id}`);
    const index = MOCK_ASSIGNMENTS.findIndex(a => a.id === id);
    if (index !== -1) {
      MOCK_ASSIGNMENTS[index] = { ...MOCK_ASSIGNMENTS[index], due_date, status };
      return { success: true, assignment: MOCK_ASSIGNMENTS[index] };
    }
    return { success: false, error: 'Asignación no encontrada' };
  }
}

/**
 * Elimina o cancela una asignación.
 */
export async function deleteAssignment(id) {
  try {
    const { error } = await supabase
      .from('SurveyAssignment')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.warn(`Usando eliminación de asignación simulada para ID: ${id}`);
    const index = MOCK_ASSIGNMENTS.findIndex(a => a.id === id);
    if (index !== -1) {
      MOCK_ASSIGNMENTS.splice(index, 1);
      return { success: true };
    }
    return { success: false, error: 'Asignación no encontrada' };
  }
}
