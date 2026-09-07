"""Brand/domain detection from dataset headers and content"""

from typing import Dict, List

BRAND_RULES = [
    {
        "name": "Netflix",
        "keys": ["netflix", "show_id", "type", "rating", "listed_in", "duration", "release_year", "country"],
        "color": "#E50914",
        "query": "Netflix streaming entertainment",
        "icon": "🎬",
        "description": "Streaming & Entertainment"
    },
    {
        "name": "Spotify",
        "keys": ["spotify", "track_name", "artist", "acousticness", "danceability", "valence", "tempo", "playlist"],
        "color": "#1DB954",
        "query": "Spotify music streaming",
        "icon": "🎵",
        "description": "Music & Audio Streaming"
    },
    {
        "name": "Amazon",
        "keys": ["asin", "amazon", "product_title", "review", "helpful_vote", "verified_purchase", "prime"],
        "color": "#FF9900",
        "query": "Amazon e-commerce marketplace",
        "icon": "📦",
        "description": "E-Commerce & Retail"
    },
    {
        "name": "Airbnb",
        "keys": ["airbnb", "listing_id", "neighbourhood", "room_type", "amenities", "host_id", "availability"],
        "color": "#FF5A5F",
        "query": "Airbnb vacation rental",
        "icon": "🏠",
        "description": "Accommodation & Travel"
    },
    {
        "name": "Uber",
        "keys": ["uber", "trip_id", "fare_amount", "pickup", "dropoff", "surge", "driver"],
        "color": "#000000",
        "query": "Uber ride sharing mobility",
        "icon": "🚗",
        "description": "Mobility & Transportation"
    },
    {
        "name": "Twitter / X",
        "keys": ["tweet", "twitter", "retweet", "hashtag", "follower", "like_count", "mention", "handle"],
        "color": "#1DA1F2",
        "query": "Twitter social media platform",
        "icon": "🐦",
        "description": "Social Media Analytics"
    },
    {
        "name": "Finance / Stocks",
        "keys": ["open", "close", "high", "low", "volume", "market_cap", "ticker", "stock", "price", "shares"],
        "color": "#F59E0B",
        "query": "stock market financial data",
        "icon": "📈",
        "description": "Finance & Capital Markets"
    },
    {
        "name": "Healthcare",
        "keys": ["patient", "diagnosis", "hospital", "treatment", "medical", "doctor", "icd", "prescription", "age", "gender"],
        "color": "#10B981",
        "query": "healthcare medical analytics",
        "icon": "🏥",
        "description": "Healthcare & Life Sciences"
    },
    {
        "name": "E-Commerce / Sales",
        "keys": ["revenue", "sales", "profit", "customer", "order", "invoice", "discount", "quantity", "sku", "category"],
        "color": "#3B82F6",
        "query": "e-commerce sales business analytics",
        "icon": "💰",
        "description": "Sales & Revenue Analytics"
    },
    {
        "name": "Human Resources",
        "keys": ["employee", "salary", "department", "hire_date", "tenure", "performance", "attrition", "headcount"],
        "color": "#8B5CF6",
        "query": "human resources workforce analytics",
        "icon": "👥",
        "description": "HR & Workforce Analytics"
    },
    {
        "name": "Supply Chain",
        "keys": ["inventory", "stock", "warehouse", "supplier", "shipment", "logistics", "lead_time", "sku"],
        "color": "#06B6D4",
        "query": "supply chain logistics management",
        "icon": "🏭",
        "description": "Supply Chain & Logistics"
    },
    {
        "name": "Web Analytics",
        "keys": ["session", "pageview", "bounce", "conversion", "traffic", "click", "impression", "ctr", "utm"],
        "color": "#EC4899",
        "query": "web analytics digital marketing",
        "icon": "🌐",
        "description": "Digital & Web Analytics"
    },
]


def detect_brand(headers: List[str], sample_rows: List[Dict], filename: str) -> Dict:
    """Detect dataset type from headers, sample data, and filename"""
    # Build searchable text
    text_parts = [filename.lower()]
    text_parts.extend(h.lower() for h in headers)
    for row in sample_rows[:5]:
        text_parts.extend(str(v).lower() for v in row.values())
    full_text = " ".join(text_parts)

    best_match = None
    best_score = 0

    for brand in BRAND_RULES:
        score = sum(1 for k in brand["keys"] if k in full_text)
        # Bonus for filename match
        if any(k in filename.lower() for k in brand["keys"]):
            score += 2
        if score > best_score:
            best_score = score
            best_match = brand

    if best_match and best_score >= 1:
        return best_match

    # Default
    return {
        "name": "General Business",
        "color": "#3B82F6",
        "query": "business data analytics",
        "icon": "📊",
        "description": "Business Intelligence"
    }
