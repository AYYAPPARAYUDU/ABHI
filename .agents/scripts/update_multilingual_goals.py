gateway_path = 'backend/app/cognitive/gateway/agent_gateway.py'
with open(gateway_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''        goal_to_submit = raw_text
        if is_follow_up and target_artifact:
            goal_to_submit = f"Modify artifact '{target_artifact}': {raw_text}"'''

replacement = '''        goal_to_submit = raw_text
        if is_follow_up and target_artifact:
            goal_to_submit = f"Modify artifact '{target_artifact}': {raw_text}"
        else:
            # Normalize multilingual terms into authoritative actions
            lower_raw = raw_text.lower()
            if any(w in lower_raw for w in ["మెయిల్", "మెయిల్స్", "ईमेल", "मेल", "மின்னஞ்சல்"]):
                goal_to_submit = "open gmail"
            elif any(w in lower_raw for w in ["వాట్సాప్", "व्हाट्सएप", "வாட்ஸ்அப்"]):
                goal_to_submit = "open whatsapp"
            elif any(w in lower_raw for w in ["యూట్యూబ్", "यूट्यूब", "யூடியூப்"]):
                goal_to_submit = "open youtube"
            elif any(w in lower_raw for w in ["కెమెరా", "कैमरा", "கேமரா"]):
                goal_to_submit = "open camera"'''

assert target in text, 'Target not found in agent_gateway.py'
text = text.replace(target, replacement, 1)

with open(gateway_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated agent_gateway.py with multilingual goal mapping!')

