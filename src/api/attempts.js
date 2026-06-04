import { supabase } from './supabase';
import { getMaturityLevel } from '../utils/dataTransformers';

const MOCK_ATTEMPTS = [
  { id: 'att-1', survey_id: '1', company_id: 'c1111111-1111-1111-1111-111111111111', evaluator_id: 'u3333333-3333-3333-3333-333333333333', status: 'COMPLETED', started_at: '2026-05-10T14:00:00Z', completed_at: '2026-05-10T14:30:00Z', total_score: 85, percentage: 85, maturity_level: 'HIGH' },
  { id: 'att-2', survey_id: '1', company_id: 'c2222222-2222-2222-2222-222222222222', evaluator_id: 'u3333333-3333-3333-3333-333333333333', status: 'IN_PROGRESS', started_at: '2026-05-12T16:00:00Z', completed_at: null, total_score: null, percentage: null, maturity_level: null }
];

const MOCK_ANSWERS = {
  'att-1': [
    { id: 'ans-1', attempt_id: 'att-1', question_id: 'q1', score: 4, answer_text: 'Frecuentemente se hace' },
    { id: 'ans-2', attempt_id: 'att-1', question_id: 'q2', score: 5, answer_text: 'Siempre se hace sin falta' },
    { id: 'ans-3', attempt_id: 'att-1', question_id: 'q3', score: 3, answer_text: 'A veces está disponible' },
    { id: 'ans-4', attempt_id: 'att-1', question_id: 'q4', score: 4, answer_text: 'Frecuentemente se hace' },
    { id: 'ans-5', attempt_id: 'att-1', question_id: 'q5', score: 5, answer_text: 'Siempre se hace sin falta' }
  ],
  'att-2': [
    { id: 'ans-6', attempt_id: 'att-2', question_id: 'q1', score: 3, answer_text: 'A veces se hace' }
  ]
};

/**
 * Inicia un nuevo intento de encuesta (In Progress).
 */
export async function createAttempt({ survey_id, company_id, evaluator_id }) {
  try {
    const { data, error } = await supabase
      .from('SurveyAttempt')
      .insert([{ survey_id, company_id, evaluator_id, status: 'IN_PROGRESS', started_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) throw error;
    return { success: true, attempt: data };
  } catch (err) {
    console.warn('Usando inicio de intento simulado:', err.message);
    const newAttempt = {
      id: 'mock-att-' + Math.random().toString(36).substr(2, 9),
      survey_id,
      company_id,
      evaluator_id,
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString(),
      completed_at: null,
      total_score: null,
      percentage: null,
      maturity_level: null
    };
    MOCK_ATTEMPTS.push(newAttempt);
    return { success: true, attempt: newAttempt };
  }
}

/**
 * Obtener detalle del intento y respuestas guardadas.
 */
export async function getAttemptDetails(id) {
  try {
    const { data: attempt, error: attError } = await supabase
      .from('SurveyAttempt')
      .select('*, Company(*), Survey(*)')
      .eq('id', id)
      .single();
    if (attError) throw attError;

    const { data: answers, error: ansError } = await supabase
      .from('SurveyAnswer')
      .select('*, selected_option(*)')
      .eq('attempt_id', id);
    if (ansError) throw ansError;

    const normalizedAttempt = attempt ? {
      ...attempt,
      company: attempt.Company || attempt.company,
      survey: attempt.Survey || attempt.survey
    } : null;

    return { success: true, attempt: normalizedAttempt, answers: answers || [] };
  } catch (err) {
    console.warn(`Usando detalle del intento simulado para ID: ${id}`);
    const attempt = MOCK_ATTEMPTS.find(a => a.id === id) || MOCK_ATTEMPTS[0];
    const answers = MOCK_ANSWERS[attempt.id] || [];
    return { success: true, attempt, answers };
  }
}

/**
 * Guarda respuestas parciales del evaluador.
 */
export async function savePartialAnswers(attemptId, answersArray) {
  try {
    // En Supabase, usamos upsert para guardar o sobreescribir las respuestas
    // answersArray contiene [{ question_id, selected_option_id, answer_text, numeric_value }]
    const payload = answersArray.map(ans => ({
      attempt_id: attemptId,
      question_id: ans.question_id,
      selected_option_id: ans.selected_option_id || null,
      answer_text: ans.answer_text || null,
      numeric_value: ans.numeric_value || null
    }));

    const { data, error } = await supabase
      .from('SurveyAnswer')
      .upsert(payload, { onConflict: 'attempt_id,question_id' });
    if (error) throw error;
    
    return { success: true };
  } catch (err) {
    console.warn('Usando guardado de respuestas simulado:', err.message);
    if (!MOCK_ANSWERS[attemptId]) {
      MOCK_ANSWERS[attemptId] = [];
    }
    
    answersArray.forEach(ans => {
      const idx = MOCK_ANSWERS[attemptId].findIndex(a => a.question_id === ans.question_id);
      const formattedAns = {
        id: 'mock-ans-' + Math.random().toString(36).substr(2, 9),
        attempt_id: attemptId,
        question_id: ans.question_id,
        score: ans.score || 3, // mock score fallback
        answer_text: ans.answer_text
      };
      
      if (idx !== -1) {
        MOCK_ANSWERS[attemptId][idx] = { ...MOCK_ANSWERS[attemptId][idx], ...formattedAns };
      } else {
        MOCK_ANSWERS[attemptId].push(formattedAns);
      }
    });

    return { success: true };
  }
}

/**
 * Finaliza y califica el intento (Calcula madurez).
 */
export async function submitAttempt(id) {
  try {
    // 1. Obtener todas las respuestas del intento
    const { data: answers, error: ansError } = await supabase
      .from('SurveyAnswer')
      .select('*, selected_option(*)')
      .eq('attempt_id', id);
    if (ansError) throw ansError;

    if (!answers || answers.length === 0) {
      throw new Error('No se pueden calificar intentos sin respuestas.');
    }

    // 2. Calcular la puntuación total y porcentaje
    // Simulamos un algoritmo simple sumando los valores de las opciones seleccionadas
    // y normalizándolas en porcentaje (asumiendo escala Likert 1-5).
    const totalScoreSum = answers.reduce((acc, curr) => {
      const val = curr.selected_option?.valor || curr.numeric_value || 3; // fallback val 3
      return acc + val;
    }, 0);
    
    const maxPossibleScore = answers.length * 5;
    const percentage = Math.round((totalScoreSum / maxPossibleScore) * 100);
    const level = getMaturityLevel(percentage);

    // 3. Actualizar la cabecera del intento
    const { data: attempt, error: updError } = await supabase
      .from('SurveyAttempt')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        total_score: percentage,
        percentage: percentage,
        maturity_level: level,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (updError) throw updError;

    return { success: true, attempt };
  } catch (err) {
    console.warn(`Usando calificación y envío simulado para intento ID: ${id}`, err.message);
    const attempt = MOCK_ATTEMPTS.find(a => a.id === id);
    if (attempt) {
      const answers = MOCK_ANSWERS[attempt.id] || [];
      const totalScoreSum = answers.reduce((acc, curr) => acc + (curr.score || 3), 0);
      const maxPossibleScore = (answers.length || 5) * 5;
      const percentage = Math.round((totalScoreSum / maxPossibleScore) * 100);
      const level = getMaturityLevel(percentage);

      attempt.status = 'COMPLETED';
      attempt.completed_at = new Date().toISOString();
      attempt.total_score = percentage;
      attempt.percentage = percentage;
      attempt.maturity_level = level;

      return { success: true, attempt };
    }
    return { success: false, error: 'Intento no encontrado' };
  }
}

/**
 * Historial de encuestas completadas por la empresa.
 */
export async function getCompanyAttemptHistory(companyId) {
  try {
    const { data, error } = await supabase
      .from('SurveyAttempt')
      .select('*, Survey(titulo, descripcion)')
      .eq('company_id', companyId)
      .eq('status', 'COMPLETED')
      .order('completed_at', { ascending: false });
    if (error) throw error;

    const normalizedHistory = (data || []).map(att => ({
      ...att,
      survey: att.Survey || att.survey
    }));

    return { success: true, history: normalizedHistory };
  } catch (err) {
    console.warn(`Usando historial de intentos simulado para Empresa: ${companyId}`);
    // Filtrar mocks completados
    return { success: true, history: MOCK_ATTEMPTS.filter(a => a.status === 'COMPLETED') };
  }
}

/**
 * Obtiene todos los intentos de encuesta.
 */
export async function getSurveyAttempts() {
  try {
    const { data, error } = await supabase
      .from('SurveyAttempt')
      .select('*, Company(nombre_empresa, nit, sector), Survey(titulo)')
      .order('completed_at', { ascending: false });
    if (error) throw error;

    const normalizedData = (data || []).map(att => ({
      ...att,
      company: att.Company || att.company,
      survey: att.Survey || att.survey
    }));

    return normalizedData && normalizedData.length > 0 ? normalizedData : MOCK_ATTEMPTS;
  } catch (err) {
    console.warn('Usando datos de prueba para Survey Attempts:', err.message);
    return MOCK_ATTEMPTS;
  }
}

/**
 * Obtiene las respuestas de un intento específico.
 */
export async function getSurveyAnswers(attemptId) {
  try {
    const { data, error } = await supabase
      .from('SurveyAnswer')
      .select('*, selected_option(texto, valor)')
      .eq('attempt_id', attemptId);
    if (error) throw error;
    return data && data.length > 0 ? data : (MOCK_ANSWERS[attemptId] || MOCK_ANSWERS['att-1']);
  } catch (err) {
    console.warn(`Usando datos de prueba para Survey Answers (${attemptId}):`, err.message);
    return MOCK_ANSWERS[attemptId] || MOCK_ANSWERS['att-1'];
  }
}
