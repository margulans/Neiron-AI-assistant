#!/usr/bin/env node
/**
 * Test 33% exploration rule with sample data
 */

const { applyExplorationRule } = require('./news-aggregator.js');

// Create sample news data
const sampleNews = [
  // Proven sources (should get 67% = 7 slots)
  { title: "OpenAI releases new model", source: "@serge_ai", score: 9.5, source_category: "proven" },
  { title: "AI breakthrough in robotics", source: "@serge_ai", score: 8.8, source_category: "proven" },
  { title: "Tesla robot update", source: "techcrunch.com", score: 8.2, source_category: "proven" },
  { title: "Google AI announcement", source: "mit-tech-review", score: 8.0, source_category: "proven" },
  { title: "Startup funding round", source: "@serge_ai", score: 7.5, source_category: "proven" },
  { title: "eVTOL certification news", source: "evtol-mag", score: 7.2, source_category: "proven" },
  { title: "Robotics conference recap", source: "ieee-spectrum", score: 6.8, source_category: "proven" },
  { title: "AI investment trends", source: "techcrunch.com", score: 6.5, source_category: "proven" },
  
  // Exploration sources (should get 33% = 3 slots)
  { title: "New AI research paper", source: "@ai_daily_digest", score: 8.5, source_category: "exploration" },
  { title: "Drone delivery pilot", source: "https://evtol.news/feed", score: 7.8, source_category: "exploration" },
  { title: "Robotics startup news", source: "@robotics_today", score: 7.3, source_category: "exploration" },
  { title: "Tech tool review", source: "new-source", score: 6.9, source_category: "exploration" },
  { title: "Industry analysis", source: "experimental-blog", score: 6.2, source_category: "exploration" }
];

console.log('🧪 Testing 33% Exploration Rule');
console.log(`📊 Input: ${sampleNews.length} articles total`);

const provenCount = sampleNews.filter(n => n.source_category === "proven").length;
const explorationCount = sampleNews.filter(n => n.source_category === "exploration").length;

console.log(`   🏆 Proven sources: ${provenCount} articles`);
console.log(`   🔍 Exploration sources: ${explorationCount} articles`);
console.log('');

// Apply the 33% rule with adaptive sizing (10-15 news)
console.log('🔧 Testing adaptive sizing (10-15 news range)...');
const selectedNews = applyExplorationRule(sampleNews); // Let it decide optimal count

console.log('📋 Selected for digest:');
selectedNews.forEach((article, index) => {
  const icon = article.source_category === "proven" ? "🏆" : "🔍";
  console.log(`${index + 1}. ${icon} ${article.title} (${article.source}) - ${article.score}`);
});

// Analyze results
const selectedProven = selectedNews.filter(n => n.source_category === "proven").length;
const selectedExploration = selectedNews.filter(n => n.source_category !== "proven").length;
const actualExplorationRatio = Math.round((selectedExploration / selectedNews.length) * 100);

console.log('');
console.log('📊 Results:');
console.log(`   🏆 Selected proven: ${selectedProven} (${100 - actualExplorationRatio}%)`);
console.log(`   🔍 Selected exploration: ${selectedExploration} (${actualExplorationRatio}%)`);
console.log(`   🎯 Target exploration ratio: 33%`);
console.log(`   ✅ Actual exploration ratio: ${actualExplorationRatio}%`);

if (actualExplorationRatio >= 30 && actualExplorationRatio <= 40) {
  console.log('   🎉 SUCCESS: Exploration ratio is within target range!');
} else if (actualExplorationRatio < 30) {
  console.log('   ⚠️  WARNING: Too few exploration sources');
} else {
  console.log('   ⚠️  WARNING: Too many exploration sources');
}