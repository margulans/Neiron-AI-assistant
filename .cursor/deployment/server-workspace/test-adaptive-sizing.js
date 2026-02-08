#!/usr/bin/env node
/**
 * Test adaptive sizing (10-15 news) with different quality scenarios
 */

const { applyExplorationRule } = require('./news-aggregator.js');

// Test scenarios with different quality levels
const testScenarios = {
  "high_quality": {
    name: "🔥 High Quality Day (20+ quality articles)",
    articles: [
      // Many high-quality articles (score >= 5.0)
      { title: "Major AI breakthrough", source: "@serge_ai", score: 9.8, source_category: "proven" },
      { title: "Revolutionary robot", source: "@serge_ai", score: 9.5, source_category: "proven" },
      { title: "eVTOL certification", source: "evtol.news", score: 9.2, source_category: "exploration" },
      { title: "Startup funding record", source: "techcrunch", score: 8.9, source_category: "proven" },
      { title: "New AI model release", source: "openai.blog", score: 8.7, source_category: "proven" },
      { title: "Robotics conference", source: "@robotics_today", score: 8.4, source_category: "exploration" },
      { title: "Industry analysis", source: "mit-review", score: 8.2, source_category: "proven" },
      { title: "Tech merger news", source: "reuters", score: 8.0, source_category: "proven" },
      { title: "Innovation report", source: "@ai_digest", score: 7.8, source_category: "exploration" },
      { title: "Market trends", source: "bloomberg", score: 7.6, source_category: "proven" },
      { title: "Research findings", source: "nature", score: 7.4, source_category: "proven" },
      { title: "Business update", source: "forbes", score: 7.2, source_category: "proven" },
      { title: "Tool review", source: "producthunt", score: 7.0, source_category: "exploration" },
      { title: "Industry news", source: "venturebeat", score: 6.8, source_category: "proven" },
      { title: "Tech analysis", source: "technoframe", score: 6.6, source_category: "exploration" },
      { title: "Startup story", source: "crunchbase", score: 6.4, source_category: "proven" },
      { title: "Product launch", source: "@tech_news", score: 6.2, source_category: "exploration" },
      { title: "Market update", source: "wsj", score: 6.0, source_category: "proven" },
      { title: "Development news", source: "github.blog", score: 5.8, source_category: "exploration" },
      { title: "Company news", source: "linkedin", score: 5.6, source_category: "proven" },
      { title: "Feature update", source: "beta.list", score: 5.4, source_category: "exploration" },
      { title: "Brief update", source: "hackernews", score: 5.2, source_category: "exploration" },
      { title: "Quick note", source: "twitter.source", score: 5.0, source_category: "exploration" }
    ]
  },
  
  "medium_quality": {
    name: "📊 Medium Quality Day (12-15 quality articles)",
    articles: [
      { title: "AI advancement", source: "@serge_ai", score: 8.5, source_category: "proven" },
      { title: "Robot update", source: "ieee", score: 7.8, source_category: "proven" },
      { title: "eVTOL progress", source: "@evtol_news", score: 7.2, source_category: "exploration" },
      { title: "Startup news", source: "techcrunch", score: 6.9, source_category: "proven" },
      { title: "Tech review", source: "@ai_digest", score: 6.5, source_category: "exploration" },
      { title: "Business story", source: "reuters", score: 6.2, source_category: "proven" },
      { title: "Innovation brief", source: "mit-review", score: 5.8, source_category: "proven" },
      { title: "Market analysis", source: "@tech_today", score: 5.5, source_category: "exploration" },
      { title: "Product news", source: "producthunt", score: 5.3, source_category: "exploration" },
      { title: "Industry update", source: "venturebeat", score: 5.1, source_category: "proven" },
      { title: "Brief note", source: "@robotics", score: 5.0, source_category: "exploration" },
      { title: "Development", source: "github", score: 4.8, source_category: "exploration" },
      { title: "Minor update", source: "beta.list", score: 4.5, source_category: "exploration" },
      { title: "Quick mention", source: "hn", score: 4.2, source_category: "exploration" },
      { title: "Low priority", source: "random.blog", score: 3.8, source_category: "exploration" }
    ]
  },
  
  "low_quality": {
    name: "🔻 Low Quality Day (8-10 quality articles)",
    articles: [
      { title: "Major announcement", source: "@serge_ai", score: 8.2, source_category: "proven" },
      { title: "Important update", source: "techcrunch", score: 7.1, source_category: "proven" },
      { title: "Significant news", source: "@ai_digest", score: 6.3, source_category: "exploration" },
      { title: "Notable development", source: "reuters", score: 5.8, source_category: "proven" },
      { title: "Relevant story", source: "mit-review", score: 5.4, source_category: "proven" },
      { title: "Decent article", source: "@evtol_news", score: 5.1, source_category: "exploration" },
      { title: "Acceptable news", source: "ieee", score: 5.0, source_category: "proven" },
      { title: "Below average", source: "venturebeat", score: 4.7, source_category: "proven" },
      { title: "Filler content", source: "random.blog", score: 4.2, source_category: "exploration" },
      { title: "Low quality", source: "spam.source", score: 3.8, source_category: "exploration" },
      { title: "Very poor", source: "bad.site", score: 3.2, source_category: "exploration" }
    ]
  }
};

console.log('🧪 Testing Adaptive Digest Sizing (10-15 news)\n');

// Test each scenario
for (const [key, scenario] of Object.entries(testScenarios)) {
  console.log(`${scenario.name}`);
  console.log('=' .repeat(50));
  
  const qualityArticles = scenario.articles.filter(a => a.score >= 5.0).length;
  console.log(`📊 Input: ${scenario.articles.length} total articles, ${qualityArticles} quality (≥5.0)`);
  
  // Apply adaptive sizing
  const selectedNews = applyExplorationRule(scenario.articles);
  
  // Analyze results
  const selectedProven = selectedNews.filter(n => n.source_category === "proven").length;
  const selectedExploration = selectedNews.filter(n => n.source_category === "exploration").length;
  const explorationRatio = Math.round((selectedExploration / selectedNews.length) * 100);
  
  console.log(`📋 Selected: ${selectedNews.length} articles total`);
  console.log(`   🏆 Proven: ${selectedProven} (${100 - explorationRatio}%)`);
  console.log(`   🔍 Exploration: ${selectedExploration} (${explorationRatio}%)`);
  
  // Quality check
  const avgScore = (selectedNews.reduce((sum, n) => sum + n.score, 0) / selectedNews.length).toFixed(1);
  const minScore = Math.min(...selectedNews.map(n => n.score)).toFixed(1);
  
  console.log(`   📈 Average score: ${avgScore}, minimum: ${minScore}`);
  
  // Size appropriateness
  let sizeStatus = '';
  if (selectedNews.length === 15) {
    sizeStatus = '🔥 Maximum size (lots of quality content)';
  } else if (selectedNews.length >= 12) {
    sizeStatus = '📊 Optimal size (good content available)';
  } else {
    sizeStatus = '📉 Minimum size (limited quality content)';
  }
  
  console.log(`   ${sizeStatus}`);
  
  // Exploration ratio check
  if (explorationRatio >= 30 && explorationRatio <= 40) {
    console.log('   ✅ Exploration ratio perfect');
  } else if (explorationRatio >= 25 && explorationRatio <= 45) {
    console.log('   ⚠️  Exploration ratio acceptable');
  } else {
    console.log('   ❌ Exploration ratio needs adjustment');
  }
  
  console.log('');
}

console.log('💡 Summary:');
console.log('   • High quality days → 15 news (maximum diversity)');
console.log('   • Medium quality days → 12 news (balanced selection)');  
console.log('   • Low quality days → 10 news (guaranteed minimum)');
console.log('   • Always maintains ~33% exploration ratio');
console.log('   • Quality threshold (≥5.0) ensures readable content');