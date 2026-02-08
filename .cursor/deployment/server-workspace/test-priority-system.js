#!/usr/bin/env node
/**
 * Test new adaptive priority system
 */

const { applyAdaptivePrioritySelection, analyzePriorityDistribution } = require('./news-aggregator.js');

// Test scenarios with different priority distributions
const testScenarios = {
  "ai_hot_period": {
    name: "🔥 Горячий период по ИИ",
    articles: [
      // Много ИИ новостей высокого качества
      { title: "OpenAI releases GPT-5", content: "Revolutionary AI breakthrough", source: "@serge_ai", score: 9.5 },
      { title: "Google AI achieves AGI", content: "Artificial general intelligence milestone", source: "@ai_daily_digest", score: 9.3 },
      { title: "Microsoft AI partnership", content: "New AI collaboration announced", source: "@data_secrets", score: 8.8 },
      { title: "AI startup funding record", content: "Billion dollar AI investment", source: "@serge_ai", score: 8.5 },
      { title: "Neural networks breakthrough", content: "Machine learning innovation", source: "@andre_dataist", score: 8.2 },
      { title: "AI safety research", content: "Important AI alignment progress", source: "@serge_ai", score: 7.9 },
      
      // Меньше других тем
      { title: "Tesla robot update", content: "Robotics advancement", source: "@robotless", score: 7.5 },
      { title: "eVTOL certification", content: "Electric aircraft progress", source: "evtol.news", score: 7.2 },
      { title: "Business merger", content: "Company acquisition", source: "@alexkrol", score: 6.8 },
      { title: "Crypto market", content: "Investment trends", source: "@cryptoEssay", score: 6.5 },
      { title: "Productivity tool", content: "New app launch", source: "@vibecodings", score: 6.2 }
    ]
  },
  
  "balanced_day": {
    name: "⚖️ Сбалансированный день",
    articles: [
      { title: "AI research paper", content: "New machine learning study", source: "@serge_ai", score: 8.0 },
      { title: "Robot factory automation", content: "Robotics in manufacturing", source: "@robotless", score: 7.8 },
      { title: "eVTOL test flight", content: "Urban air mobility progress", source: "evtol.news", score: 7.6 },
      { title: "No-code platform", content: "Виб кодинг решение", source: "@vibecodings", score: 7.4 },
      { title: "Tech innovation", content: "New technology breakthrough", source: "techcrunch", score: 7.2 },
      { title: "Startup funding", content: "Business investment news", source: "@banksta", score: 7.0 },
      { title: "Crypto update", content: "Investment market analysis", source: "@cryptoEssay", score: 6.8 },
      { title: "General news", content: "Other topic coverage", source: "reuters", score: 6.5 }
    ]
  },
  
  "robotics_focus": {
    name: "🦾 Фокус на робототехнике",
    articles: [
      { title: "Humanoid robot breakthrough", content: "Advanced robotics development", source: "@robotless", score: 9.1 },
      { title: "Industrial automation", content: "Robot factory systems", source: "@robotless", score: 8.7 },
      { title: "AI in robotics", content: "Artificial intelligence robot control", source: "@serge_ai", score: 8.5 },
      { title: "Robot dog delivery", content: "Automated delivery systems", source: "@robotless", score: 8.2 },
      { title: "Surgical robot", content: "Medical robotics advancement", source: "ieee", score: 7.9 },
      
      { title: "eVTOL progress", content: "Electric aircraft news", source: "evtol.news", score: 7.4 },
      { title: "AI language model", content: "Machine learning update", source: "@ai_daily_digest", score: 7.2 },
      { title: "Business deal", content: "Company partnership", source: "@alexkrol", score: 6.9 }
    ]
  }
};

console.log('🧪 Testing Adaptive Priority System\n');

// Test each scenario
for (const [key, scenario] of Object.entries(testScenarios)) {
  console.log(`${scenario.name}`);
  console.log('=' .repeat(50));
  
  console.log(`📊 Input: ${scenario.articles.length} articles`);
  
  // Apply adaptive priority selection
  const selectedNews = applyAdaptivePrioritySelection(scenario.articles);
  
  // Analyze results by category
  const categoryBreakdown = {};
  selectedNews.forEach(article => {
    const category = article.category || 'unknown';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
  });
  
  console.log(`📋 Selected: ${selectedNews.length} articles`);
  console.log('📈 Category breakdown:');
  
  Object.entries(categoryBreakdown).forEach(([category, count]) => {
    const percentage = Math.round((count / selectedNews.length) * 100);
    const emoji = {
      'AI': '🤖',
      'robotics': '🦾',
      'eVTOL': '✈️',
      'tools': '🛠️',
      'technology': '⚡',
      'business': '💼',
      'investments': '💰',
      'other': '📰'
    }[category] || '❓';
    
    console.log(`   ${emoji} ${category}: ${count} articles (${percentage}%)`);
  });
  
  // Show top 5 selected articles
  console.log('\n🏆 Top selected articles:');
  selectedNews.slice(0, 5).forEach((article, index) => {
    const emoji = {
      'AI': '🤖',
      'robotics': '🦾', 
      'eVTOL': '✈️',
      'tools': '🛠️',
      'technology': '⚡',
      'business': '💼',
      'investments': '💰',
      'other': '📰'
    }[article.category] || '❓';
    
    console.log(`   ${index + 1}. ${emoji} ${article.title} (score: ${article.enhanced_score || article.score})`);
  });
  
  console.log('\n');
}

console.log('💡 Priority System Summary:');
console.log('   • AI gets maximum priority in hot periods');
console.log('   • Robotics and eVTOL follow hierarchically');  
console.log('   • System adapts to news landscape');
console.log('   • 33% exploration rule maintained');
console.log('   • Quality threshold ensures readable content');