import json
import sys
import os

file_path = "data/dual-rating-data.json"
new_entry_str = sys.argv[1] # New entry as a JSON string argument

new_entry = json.loads(new_entry_str)

data = {"messageHistory": []} # Default if file doesn't exist or is empty

if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        if content.strip(): # Check if content is not empty
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                # Handle malformed JSON, maybe log and proceed with default
                print(f"Warning: {file_path} contains malformed JSON. Initializing with default structure.", file=sys.stderr)
                data = {"messageHistory": []}

if "messageHistory" not in data:
    data["messageHistory"] = []

data['messageHistory'].append(new_entry)

updated_content = json.dumps(data, ensure_ascii=False, indent=2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(updated_content)

print(f"Successfully updated {file_path} with messageId {new_entry['messageId']}")