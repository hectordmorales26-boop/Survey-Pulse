import { useState, useEffect } from 'react';
import { getSurveyDetail } from '../api/surveys';
import { getSurveyAnswers, getSurveyAttempts } from '../api/stats';
import { transformAnswersToCategoryRadar, getAnswerDistribution } from '../utils/dataTransformers';

export function useSurveyResults(surveyId, attemptId = null) {
  const [survey, setSurvey] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [radarData, setRadarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load survey structure and attempts list
  useEffect(() => {
    async function loadSurveyAndAttempts() {
      if (!surveyId) return;
      try {
        setLoading(true);
        const surveyDetail = await getSurveyDetail(surveyId);
        setSurvey(surveyDetail);

        const allAttempts = await getSurveyAttempts();
        const filteredAttempts = allAttempts.filter(a => a.survey_id === surveyId);
        setAttempts(filteredAttempts);

        // Select the first attempt or the requested one by default
        if (filteredAttempts.length > 0) {
          const initialAttempt = attemptId 
            ? filteredAttempts.find(a => a.id === attemptId) 
            : filteredAttempts[0];
          setSelectedAttempt(initialAttempt || filteredAttempts[0]);
        }
      } catch (err) {
        console.error('Error al cargar datos del reporte:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSurveyAndAttempts();
  }, [surveyId, attemptId]);

  // Load answers and transform when selected attempt changes
  useEffect(() => {
    async function loadAnswers() {
      if (!selectedAttempt || !survey) return;
      try {
        const attemptAnswers = await getSurveyAnswers(selectedAttempt.id);
        setAnswers(attemptAnswers);

        // Transform for radar chart
        const radar = transformAnswersToCategoryRadar(attemptAnswers, survey.questions);
        setRadarData(radar);
      } catch (err) {
        console.error('Error al cargar respuestas del intento:', err);
      }
    }

    loadAnswers();
  }, [selectedAttempt, survey]);

  const selectAttempt = (id) => {
    const att = attempts.find(a => a.id === id);
    if (att) setSelectedAttempt(att);
  };

  const getQuestionDistribution = (questionId) => {
    // Get all answers from all attempts of this survey for this specific question
    // To show answer percentage (Pie Chart)
    // We mock some answers from other attempts if we don't have them in Supabase
    const mockResponses = [
      { question_id: questionId, score: 5, answer_text: 'Siempre se hace sin falta' },
      { question_id: questionId, score: 5, answer_text: 'Siempre se hace sin falta' },
      { question_id: questionId, score: 4, answer_text: 'Frecuentemente se hace' },
      { question_id: questionId, score: 3, answer_text: 'A veces está disponible' },
      { question_id: questionId, score: 2, answer_text: 'Raras veces se hace' }
    ];
    return getAnswerDistribution(mockResponses, questionId);
  };

  return {
    survey,
    attempts,
    selectedAttempt,
    answers,
    radarData,
    loading,
    error,
    selectAttempt,
    getQuestionDistribution
  };
}

export default useSurveyResults;
