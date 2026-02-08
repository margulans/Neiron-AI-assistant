#!/usr/bin/env python3
"""
Advanced News Collector for Margulan
Collects, filters, and formats news from multiple sources
"""

import json
import datetime
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class NewsItem:
    title: str
    url: str
    content: str
    source: str
    category: str
    score: int
    published: datetime.datetime

class NewsCollector:
    def __init__(self):
        self.keywords = {
            'ai': ['artificial intelligence', 'AI ', 'машинное обучение', 'neural network', 'GPT', 'LLM'],
            'robotics': ['robot', 'робот', 'automation', 'автоматизация', 'Boston Dynamics'],
            'evtol': ['eVTOL', 'electric aircraft', 'urban air mobility', 'flying car', 'drone taxi'],
            'drones': ['drone delivery', 'дрон доставка', 'UAV', 'unmanned'],
            'business': ['startup', 'funding', 'стартап', 'venture capital', 'IPO'],
            'tools': ['no-code', 'productivity', 'automation tool', 'вайбкодинг']
        }
        
        self.sources = {
            'techcrunch.com': 9,
            'openai.com': 10,
            'evtol.com': 8,
            'technologyreview.com': 9,
            'spectrum.ieee.org': 7,
            'producthunt.com': 6
        }
    
    def score_article(self, title: str, content: str, source: str) -> int:
        """Score article based on Margulan's interests"""
        score = self.sources.get(source, 3)
        text = (title + ' ' + content).lower()
        
        for category, keywords in self.keywords.items():
            for keyword in keywords:
                if keyword.lower() in text:
                    if category == 'ai':
                        score += 5
                    elif category == 'evtol':
                        score += 4
                    elif category == 'robotics':
                        score += 4
                    else:
                        score += 2
        
        return min(score, 20)  # Cap at 20
    
    def format_digest(self, articles: List[NewsItem], digest_type: str) -> str:
        """Format articles into a digest"""
        if not articles:
            return f"🤖 {digest_type} дайджест пуст - новых релевантных новостей не найдено."
            
        # Group by category
        categories = {}
        for article in articles:
            if article.category not in categories:
                categories[article.category] = []
            categories[article.category].append(article)
        
        digest = f"📰 **{digest_type} Дайджест Новостей**\n\n"
        
        for category, items in categories.items():
            if not items:
                continue
                
            category_emoji = {
                'ai': '🤖',
                'robotics': '🦾', 
                'evtol': '✈️',
                'drones': '🚁',
                'business': '💼',
                'tools': '🛠'
            }.get(category, '📡')
            
            digest += f"{category_emoji} **{category.upper()}:**\n"
            
            for item in sorted(items, key=lambda x: x.score, reverse=True)[:3]:
                digest += f"• [{item.title}]({item.url})\n"
                if item.content:
                    digest += f"  _{item.content[:100]}..._\n"
                digest += f"  📊 Score: {item.score} | 🏷 {item.source}\n\n"
        
        return digest

def main():
    collector = NewsCollector()
    print("News Collector initialized for Margulan")
    print(f"Tracking {len(collector.keywords)} categories")
    print(f"Monitoring {len(collector.sources)} priority sources")

if __name__ == "__main__":
    main()