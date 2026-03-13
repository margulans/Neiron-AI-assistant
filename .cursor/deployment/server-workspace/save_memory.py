
import json
import os

file_path = "data/dual-rating-data.json"
message_id = "312"
expert = "Прогноз"
source = "cossa.ru"
category = "ИИ, Россия, Образование"
title = "Потенциал России в сфере ИИ"
timestamp = 1773408609310

# Create directory if it doesn't exist
os.makedirs(os.path.dirname(file_path), exist_ok=True)

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    data = []

new_entry = {
    "messageId": message_id,
    "expert": expert,
    "source": source,
    "category": category,
    "title": title,
    "timestamp": timestamp
}
data.append(new_entry)

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Memory saved successfully.")
