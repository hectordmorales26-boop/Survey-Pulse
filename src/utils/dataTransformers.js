/**
 * dataTransformers.js
 * Utilidades para transformar datos de Supabase/Prisma a formatos legibles
 * y compatibles con librerías de gráficas como Recharts o Tremor.
 */

/**
 * Asigna un color hexadecimal según el nivel de madurez (Prisma Enum).
 * Útil para mantener consistencia visual en dashboards.
 */
export function getMaturityColor(level) {
  const colors = {
    'CRITICAL': '#b23b3b', // Rust/Red clay
    'LOW': '#b45309',      // Warm amber/orange
    'MEDIUM': '#a16207',   // Muted gold
    'HIGH': '#2e5b88',      // Slate/blue
    'EXCELLENT': '#6b8e23', // Olive green
  };
  return colors[level] || '#96867a';
}

/**
 * Convierte un score numérico en una etiqueta de nivel de madurez (MaturityLevel Enum).
 * Basado en los rangos definidos para la organización.
 */
export function getMaturityLevel(score) {
  if (score < 35) return 'CRITICAL';
  if (score < 50) return 'LOW';
  if (score < 75) return 'MEDIUM';
  if (score < 90) return 'HIGH';
  return 'EXCELLENT';
}

/**
 * Traduce el enum de madurez a un texto amigable en español.
 */
export function translateMaturityLevel(level) {
  const labels = {
    'CRITICAL': 'Crítico',
    'LOW': 'Bajo',
    'MEDIUM': 'Medio',
    'HIGH': 'Alto',
    'EXCELLENT': 'Excelente'
  };
  return labels[level] || level || 'Desconocido';
}

/**
 * Calcula el promedio de una lista de intentos utilizando el campo 'percentage'.
 * Solo considera intentos con estado 'COMPLETED'.
 */
export function calculateAveragePercentage(attempts) {
  if (!attempts || attempts.length === 0) return 0;
  
  const completed = attempts.filter(a => a.status === 'COMPLETED');
  if (completed.length === 0) return 0;

  const sum = completed.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
  return Math.round(sum / completed.length);
}

/**
 * Agrupa los intentos por empresa, calculando estadísticas agregadas.
 * Accede a los datos mediante la relación attempt.company.nombre_empresa.
 */
export function groupStatsByCompany(attempts) {
  if (!attempts || attempts.length === 0) return [];
  
  const companyMap = attempts.reduce((acc, curr) => {
    // Acceso a relación Company según schema.prisma
    const compName = curr.company?.nombre_empresa || 'Empresa Desconocida';
    
    if (!acc[compName]) {
      acc[compName] = {
        name: compName,
        nit: curr.company?.nit || 'N/A',
        sector: curr.company?.sector || 'General',
        attemptsCount: 0,
        percentageSum: 0,
        attempts: []
      };
    }
    
    if (curr.status === 'COMPLETED') {
      acc[compName].attemptsCount += 1;
      acc[compName].percentageSum += (curr.percentage || 0);
      acc[compName].attempts.push(curr);
    }
    
    return acc;
  }, {});

  return Object.values(companyMap)
    .filter(c => c.attemptsCount > 0)
    .map(company => {
      const avg = Math.round(company.percentageSum / company.attemptsCount);
      return {
        name: company.name,
        nit: company.nit,
        sector: company.sector,
        attemptsCount: company.attemptsCount,
        averagePercentage: avg,
        maturityLevel: getMaturityLevel(avg),
        color: getMaturityColor(getMaturityLevel(avg)),
        attempts: company.attempts
      };
    });
}

/**
 * Agrupa intentos por mes para visualizar tendencias temporales.
 */
export function transformAttemptsToTimeline(attempts) {
  if (!attempts || attempts.length === 0) return [];

  const timeline = attempts
    .filter(a => a.status === 'COMPLETED' && a.completed_at)
    .reduce((acc, curr) => {
      const date = new Date(curr.completed_at);
      const label = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
      
      if (!acc[label]) {
        acc[label] = { name: label, score: 0, count: 0 };
      }
      
      acc[label].score += curr.percentage || 0;
      acc[label].count += 1;
      return acc;
    }, {});

  return Object.values(timeline).map(t => ({
    name: t.name,
    promedio: Math.round(t.score / t.count)
  }));
}

/**
 * Transforma respuestas a formato para Radar Chart por Categoría.
 * Utiliza el join de Category (category.name) y el valor numérico (numeric_value).
 */
export function transformAnswersToCategoryRadar(answers, questions) {
  if (!answers || !questions) return [];

  const questionsMap = questions.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {});

  const categoryScores = answers.reduce((acc, ans) => {
    const question = questionsMap[ans.question_id];
    if (question) {
      // Uso de la relación category.name definida en el schema
      const catName = question.category?.name || question.categoria_indicador || 'General';
      
      if (!acc[catName]) {
        acc[catName] = { sum: 0, count: 0 };
      }
      
      // numeric_value es el campo correcto según el schema para SurveyAnswer
      acc[catName].sum += ans.numeric_value || 0;
      acc[catName].count += 1;
    }
    return acc;
  }, {});

  return Object.keys(categoryScores).map(category => {
    const avg = categoryScores[category].sum / categoryScores[category].count;
    // Escala: Si la base es 1-5, convertimos a 0-100% (multiplicando por 20)
    // Si ya es porcentual, se deja igual.
    const isFiveScale = avg <= 5;
    const finalScore = isFiveScale ? Math.round(avg * 20) : Math.round(avg);

    return {
      subject: category,
      score: finalScore,
      fullMark: 100
    };
  });
}

/**
 * Agrupa frecuencias de respuestas de una pregunta para Pie Charts.
 */
export function getAnswerDistribution(answers, questionId) {
  if (!answers) return [];
  
  const filtered = answers.filter(a => a.question_id === questionId);
  
  const distribution = filtered.reduce((acc, curr) => {
    // Prioriza texto de opción, luego texto libre, luego valor numérico
    const text = curr.selected_option?.texto || 
                 curr.answer_text || 
                 `Valor: ${curr.numeric_value}`;
                 
    acc[text] = (acc[text] || 0) + 1;
    return acc;
  }, {});

  return Object.keys(distribution).map(name => ({
    name,
    value: distribution[name]
  }));
}