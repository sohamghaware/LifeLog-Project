// backend/utils/moodAnalysis.js
const moodScoreMap = {
  Happy: 2,
  Neutral: 0,
  Sad: -2,
  Stressed: -2,
};

// Compute average mood score per category from an array of entry objects
const computeCategoryMoodScores = (entries) => {
  const stats = {};

  entries.forEach((entry) => {
    const cat = entry.category || "Other";
    const moodScore = moodScoreMap[entry.mood] ?? 0;
    const duration = entry.durationMinutes || 30;

    if (!stats[cat]) {
      stats[cat] = { totalScore: 0, totalDuration: 0, count: 0 };
    }

    stats[cat].totalScore += moodScore * duration;
    stats[cat].totalDuration += duration;
    stats[cat].count += 1;
  });

  const result = Object.entries(stats).map(([category, data]) => {
    const avg = data.totalDuration ? data.totalScore / data.totalDuration : 0;
    return { category, avgMoodScore: avg, count: data.count, totalDuration: data.totalDuration };
  });

  // Sort descending by avgMoodScore (best → worst)
  result.sort((a, b) => b.avgMoodScore - a.avgMoodScore);
  return result;
};

// Generate smart behavioral insights
const generateSuggestions = (categoryScores) => {
  if (!categoryScores || categoryScores.length === 0) {
    return [
      "Keep logging to unlock fresh insights! 📊"
    ];
  }

  const positiveCategories = categoryScores.filter((c) => c.avgMoodScore > 0.5);
  const negativeCategories = categoryScores.filter((c) => c.avgMoodScore < -0.5);
  const highFrequencyCategory = [...categoryScores].sort((a, b) => b.count - a.count)[0];

  const suggestions = [];

  // Insight 1: Leverage positives
  if (positiveCategories.length > 0) {
    const topPositive = positiveCategories[0];
    suggestions.push(`Doing ${topPositive.category} activity boosts your mood! Try it for ${Math.round((topPositive.totalDuration / topPositive.count) || 30)} mins today. 🌟`);
  } else {
    suggestions.push("Take a breather. Rest, hydrate, and relax. 💧");
  }

  // Insight 2: Mitigate negatives
  if (negativeCategories.length > 0) {
    const topNegative = negativeCategories[0];
    suggestions.push(`${topNegative.category} activity often brings your mood down. Make sure to relax afterwards! 🧘`);
  }

  // Insight 3: Habit/Frequency observation
  if (highFrequencyCategory && highFrequencyCategory.count > 3) {
    if (highFrequencyCategory.avgMoodScore >= 0) {
      suggestions.push(`Great habit! ${highFrequencyCategory.category} activity keeps your mood up. Keep it going! 🚀`);
    } else {
      suggestions.push(`Watch out! Too much ${highFrequencyCategory.category} activity is draining you. Take a break. 🛋️`);
    }
  }

  // Fallback if we only generated 1 or 2
  if (suggestions.length < 3) {
    suggestions.push(`Remember to balance your focus with some well-deserved rest. ⚖️`);
  }

  // Pick a single random suggestion to keep it short and sweet
  const singleSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
  return [singleSuggestion];
};

module.exports = {
  computeCategoryMoodScores,
  generateSuggestions,
};
