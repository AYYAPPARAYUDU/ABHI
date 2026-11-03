comms_path = 'backend/app/assistant/communications_assistant.py'
with open(comms_path, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '    # 4. If table is empty, seed initial dynamic communications trace'
end_marker = '    return {\n        "success": True,\n        "count": len(stored_msgs),\n        "messages": stored_msgs\n    }'

idx_start = text.find(start_marker)
idx_end = text.find(end_marker)

assert idx_start != -1 and idx_end != -1, 'Markers not found in communications_assistant.py'

replacement = '''    # 4. Return live stored messages without synthetic mock seeds.
    # The user's live browser (Chrome) holds active Gmail and WhatsApp Web sessions.
'''

text = text[:idx_start] + replacement + text[idx_end:]

with open(comms_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated communications_assistant.py to remove seeds!')

