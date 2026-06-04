import * as XLSX from 'xlsx';

/**
 * Normaliza un tipo de pregunta en base a una cadena de texto.
 * Debe coincidir con los tipos de Enum del esquema de base de datos:
 * 'LIKERT', 'MULTIPLE_CHOICE', 'YES_NO', 'OPEN_TEXT', 'NUMERIC'
 */
export function normalizeQuestionType(typeStr, hasOptions = false) {
  if (!typeStr) {
    return hasOptions ? 'LIKERT' : 'OPEN_TEXT';
  }
  const clean = typeStr.toString().trim().toUpperCase();

  if (clean.includes('LIKERT') || clean.includes('ESCALA')) return 'LIKERT';
  if (clean.includes('SI_NO') || clean.includes('SÍ_NO') || clean.includes('SI/NO') || clean.includes('SÍ/NO') || clean.includes('YES_NO') || clean.includes('YES/NO') || clean.includes('BOOLEAN')) return 'YES_NO';
  if (clean.includes('MULTIPLE') || clean.includes('MÚLTIPLE') || clean.includes('CHOICE') || clean.includes('SELECCION') || clean.includes('SELECCIÓN')) return 'MULTIPLE_CHOICE';
  if (clean.includes('OPEN') || clean.includes('TEXT') || clean.includes('ABIERTA') || clean.includes('TEXTO')) return 'OPEN_TEXT';
  if (clean.includes('NUMERIC') || clean.includes('NUMERO') || clean.includes('NÚMERO')) return 'NUMERIC';

  // Si no coincide y tiene opciones detectadas, asumimos LIKERT, si no OPEN_TEXT
  return hasOptions ? 'LIKERT' : 'OPEN_TEXT';
}

/**
 * Parsea un string que contiene múltiples opciones en un array de objetos { texto, valor }
 * Formatos admitidos:
 * - "1: Nunca; 2: A veces; 3: Siempre"
 * - "Nunca, A veces, Siempre" (se asignan valores 1, 2, 3...)
 * - "Totalmente en desacuerdo\nEn desacuerdo\nNeutral..."
 */
export function parseOptionsString(optionsStr) {
  if (!optionsStr) return [];
  
  // Dividir por punto y coma, coma o salto de línea
  const splitChar = optionsStr.includes(';') ? ';' : optionsStr.includes('\n') ? '\n' : ',';
  const parts = optionsStr.split(splitChar).map(p => p.trim()).filter(Boolean);
  
  const options = [];
  parts.forEach((part, index) => {
    // Buscar patrón "número: texto" o "número - texto"
    const match = part.match(/^(\d+)\s*[:\-]\s*(.+)$/);
    if (match) {
      options.push({
        texto: match[2].trim(),
        valor: Number(match[1])
      });
    } else {
      options.push({
        texto: part,
        valor: index + 1
      });
    }
  });
  
  return options;
}

/**
 * Procesa un archivo Excel (como ArrayBuffer) y extrae la información de todas las hojas.
 * Aplica una heurística para detectar qué hoja contiene la encuesta y retorna el reporte.
 */
export function parseSurveyExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetReports = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convertir a matriz de celdas (array de arrays)
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    if (rows.length === 0) continue;

    // --- HEURÍSTICA DE DETECCIÓN DE CABECERAS ---
    // Analizar las primeras 15 filas para encontrar la cabecera
    let headerRowIndex = -1;
    let colIndices = {
      pregunta: -1,
      categoria: -1,
      tipo: -1,
      obligatorio: -1,
      indicador: -1,
      opciones: -1,
      opcionesMultiples: [] // Para guardar columnas como "Opción 1", "Opción 2"...
    };

    let bestHeaderMatchCount = 0;

    for (let r = 0; r < Math.min(15, rows.length); r++) {
      const row = rows[r];
      let matchCount = 0;
      let tempCols = {
        pregunta: -1,
        categoria: -1,
        tipo: -1,
        obligatorio: -1,
        indicador: -1,
        opciones: -1,
        opcionesMultiples: []
      };

      row.forEach((cell, cIndex) => {
        if (!cell) return;
        const cellText = cell.toString().toLowerCase().trim();

        if (cellText.match(/pregunta|question|enunciado|item|ítem|texto/)) {
          tempCols.pregunta = cIndex;
          matchCount += 3; // La pregunta es muy importante
        } else if (cellText.match(/categor[ií]a|category|dimensi[oó]n/)) {
          tempCols.categoria = cIndex;
          matchCount += 2;
        } else if (cellText.match(/tipo|type/)) {
          tempCols.tipo = cIndex;
          matchCount += 1.5;
        } else if (cellText.match(/obligatorio|requerido|required|obligatoria/)) {
          tempCols.obligatorio = cIndex;
          matchCount += 1;
        } else if (cellText.match(/indicador|subcategor[ií]a|sub-category|aspecto/)) {
          tempCols.indicador = cIndex;
          matchCount += 1;
        } else if (cellText.match(/opci[oó]n\s*\d+|option\s*\d+|opt\s*\d+/)) {
          tempCols.opcionesMultiples.push({ name: cell.toString(), index: cIndex });
        } else if (cellText.match(/opci[oó]n|option|respuestas|escala/)) {
          tempCols.opciones = cIndex;
          matchCount += 1.5;
        }
      });

      // Sumar puntos por columnas de opciones múltiples si se encuentran
      if (tempCols.opcionesMultiples.length > 0) {
        matchCount += Math.min(tempCols.opcionesMultiples.length * 0.5, 2);
      }

      // Si encontramos al menos una columna de "pregunta"
      if (tempCols.pregunta !== -1 && matchCount > bestHeaderMatchCount) {
        bestHeaderMatchCount = matchCount;
        headerRowIndex = r;
        colIndices = tempCols;
      }
    }

    // Si no se encontró cabecera con pregunta, omitir o dar puntuación 0
    if (headerRowIndex === -1) {
      sheetReports.push({
        name: sheetName,
        score: 0,
        questions: [],
        isValid: false,
        warning: 'No se detectó una columna de "Pregunta" o "Enunciado".'
      });
      continue;
    }

    // --- PROCESAMIENTO DE PREGUNTAS ---
    const questions = [];
    let lastSeenCategory = 'General';
    let questionOrder = 1;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      // Si la fila está completamente vacía o la pregunta está vacía, saltar
      if (!row || row.length === 0) continue;
      
      const qText = colIndices.pregunta !== -1 && row[colIndices.pregunta] 
        ? row[colIndices.pregunta].toString().trim() 
        : '';
      
      if (!qText) continue; // Pregunta vacía

      // Categoría
      let category = lastSeenCategory;
      if (colIndices.categoria !== -1 && row[colIndices.categoria]) {
        category = row[colIndices.categoria].toString().trim();
        lastSeenCategory = category; // Recordar para filas siguientes
      }

      // Indicador/subcategoría
      const indicador = colIndices.indicador !== -1 && row[colIndices.indicador]
        ? row[colIndices.indicador].toString().trim()
        : null;

      // Obligatorio
      let obligatorio = true;
      if (colIndices.obligatorio !== -1 && row[colIndices.obligatorio] !== undefined) {
        const val = row[colIndices.obligatorio].toString().toLowerCase().trim();
        if (val === 'no' || val === 'false' || val === '0') {
          obligatorio = false;
        }
      }

      // Opciones
      let options = [];
      
      // 1. Verificar si hay opciones en la misma celda de opciones
      if (colIndices.opciones !== -1 && row[colIndices.opciones]) {
        options = parseOptionsString(row[colIndices.opciones].toString());
      }
      
      // 2. Si no hay, verificar si hay múltiples columnas de opciones
      if (options.length === 0 && colIndices.opcionesMultiples.length > 0) {
        colIndices.opcionesMultiples.forEach((colOpt) => {
          const val = row[colOpt.index];
          if (val !== undefined && val !== null && val.toString().trim() !== '') {
            // Determinar valor numérico a partir del nombre de la cabecera o secuencia
            const numMatch = colOpt.name.match(/\d+/);
            const valNum = numMatch ? Number(numMatch[0]) : (options.length + 1);
            options.push({
              texto: val.toString().trim(),
              valor: valNum
            });
          }
        });
      }

      // Tipo de pregunta
      const rawType = colIndices.tipo !== -1 && row[colIndices.tipo]
        ? row[colIndices.tipo].toString().trim()
        : '';
      
      const tipo = normalizeQuestionType(rawType, options.length > 0);

      // Rellenar opciones por defecto si es necesario
      if (tipo === 'YES_NO' && options.length === 0) {
        options = [
          { texto: 'Sí', valor: 1 },
          { texto: 'No', valor: 0 }
        ];
      } else if (tipo === 'LIKERT' && options.length === 0) {
        options = [
          { texto: 'Totalmente en desacuerdo', valor: 1 },
          { texto: 'En desacuerdo',           valor: 2 },
          { texto: 'Neutral',                  valor: 3 },
          { texto: 'De acuerdo',              valor: 4 },
          { texto: 'Totalmente de acuerdo',   valor: 5 }
        ];
      }

      questions.push({
        _id: 'excel-q-' + questionOrder,
        pregunta: qText,
        categoria_nombre: category,
        categoria_indicador: indicador,
        tipo,
        obligatorio,
        opciones: options,
        orden: questionOrder
      });

      questionOrder++;
    }

    // Calcular puntaje final de la hoja
    // Un score alto significa que tiene preguntas y columnas correctas estructuradas
    const score = bestHeaderMatchCount + (questions.length * 0.5);

    sheetReports.push({
      name: sheetName,
      score: questions.length > 0 ? score : 0,
      headers: colIndices,
      questions,
      isValid: questions.length > 0
    });
  }

  // Ordenar reportes por puntaje descendente para que la más probable sea la primera
  sheetReports.sort((a, b) => b.score - a.score);

  return sheetReports;
}
