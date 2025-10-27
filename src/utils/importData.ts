import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

// Helper function to clean text fields
const cleanText = (text: string): string => {
  return text?.trim().replace(/\s+/g, ' ') || '';
};

export const importRoadSigns = async (file: File) => {
  let signs = [];

  if (file.type === 'text/csv') {
    const csvText = await file.text();
    const lines = csvText.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      if (values.length < 8) continue;
      
      signs.push({
        name_es: cleanText(values[1] || ''),
        description_es: cleanText(values[2] || ''),
        sign_type: cleanText(values[3] || ''),
        image_url: cleanText(values[4] || ''),
        name_ru: cleanText(values[6] || ''),
        description_ru: cleanText(values[7] || ''),
        sign_number: cleanText(values[8] || '')
      });
    }
  } else {
    // Excel файлы
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    signs = jsonData.map((row: any) => ({
      name_es: cleanText(row.name || row.name_es || row['Название (ES)'] || ''),
      description_es: cleanText(row.description || row.description_es || row['Описание (ES)'] || ''),
      sign_type: cleanText(row.sign_type || row['Тип знака'] || ''),
      image_url: cleanText(row.image_url || row['URL изображения'] || ''),
      name_ru: cleanText(row.name_translation || row.name_ru || row['Название (RU)'] || ''),
      description_ru: cleanText(row.description_translation || row.description_ru || row['Описание (RU)'] || ''),
      sign_number: cleanText(row.sign_number || row['Номер знака'] || '')
    }));
  }
  
  console.log(`Importing ${signs.length} road signs...`);
  
  const { data, error } = await supabase
    .from('road_signs')
    .insert(signs);
  
  if (error) {
    console.error('Error importing road signs:', error);
    throw error;
  }
  
  console.log('Road signs imported successfully!');
  return data;
};

export const importLanguageTerms = async (file: File) => {
  let terms = [];

  if (file.type === 'text/csv') {
    const csvText = await file.text();
    const lines = csvText.split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current);
      
      if (values.length < 5) continue;
      
      terms.push({
        term_es: cleanText(values[1] || ''),
        term_ru: cleanText(values[2] || ''),
        description_es: cleanText(values[3] || ''),
        description_ru: cleanText(values[9] || ''),
        difficulty: cleanText(values[4]) || 'medium',
        category: values[5] || null,
        image_url: cleanText(values[6]) || null,
        audio_url: cleanText(values[7]) || null
      });
    }
  } else {
    // Excel файлы
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    terms = jsonData.map((row: any) => ({
      term_es: cleanText(row.term || row.term_es || row['Термин (ES)'] || ''),
      term_ru: cleanText(row.translation || row.term_ru || row['Термин (RU)'] || ''),
      description_es: cleanText(row.description || row.description_es || row['Описание (ES)'] || ''),
      description_ru: cleanText(row.description_translation || row.description_ru || row['Описание (RU)'] || ''),
      difficulty: cleanText(row.difficulty || row['Сложность'] || 'medium'),
      category: row.category || row['Категория'] || null,
      image_url: cleanText(row.image_url || row['URL изображения'] || '') || null,
      audio_url: cleanText(row.audio_url || row['URL аудио'] || '') || null
    }));
  }
  
  console.log(`Importing ${terms.length} language terms...`);
  
  const { data, error } = await supabase
    .from('language_terms')
    .insert(terms);
  
  if (error) {
    console.error('Error importing language terms:', error);
    throw error;
  }
  
  console.log('Language terms imported successfully!');
  return data;
};