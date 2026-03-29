export function calculateExamReadiness(stats: any, readinessData: any): number {
  if (!stats) return 10;
  
  if (stats.tests_completed === 0) {
    // If no tests completed, fallback to accuracy, or 10 if accuracy is 0.
    return stats.accuracy > 0 ? Math.round(stats.accuracy) : 10;
  }

  const accuracyScore = Math.max(0, (stats.accuracy || 0) / 100);
  const topicsCovered = (readinessData?.topics_covered_percent || 0) / 100;
  const basePerformance = (accuracyScore * 0.8) + (topicsCovered * 0.2);

  let confidenceFactor = 0;
  const tests = stats.tests_completed || 0;
  
  if (tests < 5) confidenceFactor = 0.05;
  else if (tests < 20) confidenceFactor = 0.1 + (((tests - 5) / 15) * 0.2);
  else if (tests < 50) confidenceFactor = 0.3 + (((tests - 20) / 30) * 0.4);
  else if (tests < 80) confidenceFactor = 0.7 + (((tests - 50) / 30) * 0.2);
  else confidenceFactor = 1.0;

  const unq = readinessData?.unique_questions_answered || 0;
  if (unq > 0) {
    const qBonus = Math.min(unq / 1500, 1) * 0.1;
    confidenceFactor = Math.min(1.0, confidenceFactor + qBonus);
  }

  let readinessPercent = basePerformance * confidenceFactor * 100;

  if (tests >= 15) readinessPercent += 5; // activity bonus

  if (accuracyScore < 0.6) readinessPercent = Math.min(readinessPercent, 30);
  if (accuracyScore < 0.8) readinessPercent = Math.min(readinessPercent, 70);

  let finalScore = Math.round(readinessPercent);
  
  // Dashboard floors to 10% visually for the dial "Начало пути" if there's any data
  if (finalScore < 10 && (tests > 0 || stats.accuracy > 0)) finalScore = 10;
  if (finalScore === 0) finalScore = 10;

  return finalScore;
}
