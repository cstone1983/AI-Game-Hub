# Infinity Platform - Master Game Configuration
# Shared Data Dictionary for Python Backend Logic

GAME_CONFIG = {
    "economy": {
        "starting_balance": 120000,
        "starting_miles": 0,
        "revenue_per_mile": 0.15,
        "maintenance_cost_per_percent": 500,
        "luxury_fare_multiplier": 2.0,
        "luxury_capacity_modifier": 0.5
    },
    
    # Mapped to a standard 1920x1080 canvas map
    "airports": {
        "JFK": {"id": "JFK", "name": "New York (JFK)", "canvas_x": 520, "canvas_y": 350, "region": "North America"},
        "LAX": {"id": "LAX", "name": "Los Angeles (LAX)", "canvas_x": 250, "canvas_y": 380, "region": "North America"},
        "LHR": {"id": "LHR", "name": "London (LHR)", "canvas_x": 910, "canvas_y": 270, "region": "Europe"},
        "FRA": {"id": "FRA", "name": "Frankfurt (FRA)", "canvas_x": 950, "canvas_y": 280, "region": "Europe"},
        "DXB": {"id": "DXB", "name": "Dubai (DXB)", "canvas_x": 1180, "canvas_y": 450, "region": "Middle East"},
        "HND": {"id": "HND", "name": "Tokyo (HND)", "canvas_x": 1650, "canvas_y": 380, "region": "Asia"},
        "SIN": {"id": "SIN", "name": "Singapore (SIN)", "canvas_x": 1450, "canvas_y": 620, "region": "Asia"},
        "SYD": {"id": "SYD", "name": "Sydney (SYD)", "canvas_x": 1720, "canvas_y": 820, "region": "Oceania"},
        "GRU": {"id": "GRU", "name": "Sao Paulo (GRU)", "canvas_x": 680, "canvas_y": 750, "region": "South America"},
        "JNB": {"id": "JNB", "name": "Johannesburg (JNB)", "canvas_x": 1050, "canvas_y": 780, "region": "Africa"}
    },

    "fleet": {
        "atr_72": {
            "id": "atr_72",
            "name": "ATR 72",
            "tier": 1,
            "price": 15000,
            "speed_multiplier": 1.0,
            "passenger_capacity": 70,
            "degradation_rate_per_flight": 2.0
        },
        "b737": {
            "id": "b737",
            "name": "Boeing 737",
            "tier": 2,
            "price": 50000,
            "speed_multiplier": 1.5,
            "passenger_capacity": 180,
            "degradation_rate_per_flight": 1.5
        },
        "a380": {
            "id": "a380",
            "name": "Airbus A380",
            "tier": 3,
            "price": 250000,
            "speed_multiplier": 1.8,
            "passenger_capacity": 500,
            "degradation_rate_per_flight": 1.0
        }
    }
}
