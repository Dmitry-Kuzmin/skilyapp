import { supabase } from "@/integrations/supabase/client";

// Helper function to clean text fields
const cleanText = (text: string): string => {
  return text?.trim().replace(/\s+/g, ' ') || '';
};

export const importRoadSigns = async (csvText: string) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  
  const signs = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Parse CSV line (handling quoted fields with commas)
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
      name_es: cleanText(values[1]),
      description_es: cleanText(values[2]),
      sign_type: cleanText(values[3]),
      image_url: cleanText(values[4]),
      name_ru: cleanText(values[6]),
      description_ru: cleanText(values[7]),
      sign_number: cleanText(values[8])
    });
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

export const importLanguageTerms = async (csvText: string) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  
  const terms = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Parse CSV line (handling quoted fields with commas)
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
    
    if (values.length < 9) continue;
    
    terms.push({
      term_es: cleanText(values[1]),
      term_ru: cleanText(values[2]),
      description_es: cleanText(values[3]),
      difficulty: cleanText(values[4]) || 'medium',
      category: values[5] || null,
      image_url: cleanText(values[6]) || null,
      audio_url: cleanText(values[7]) || null,
      description_ru: cleanText(values[9])
    });
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