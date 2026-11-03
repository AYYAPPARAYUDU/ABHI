import sys

def main():
    file_path = 'backend/app/cognitive/gateway/agent_gateway.py'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update goal mapping
    target_1 = 'elif any(w in lower_raw for w in ["యూట్యూబ్", "यूट्यूब", "யூடியூப்"]):'
    replacement_1 = '''elif any(w in lower_raw for w in ["పాట", "గానా", "గాన", "సంగీతం", "గానం", "गाना", "गीत", "संगीत", "பாடல்", "இசை"]):
                goal_to_submit = "open youtube"
            elif any(w in lower_raw for w in ["యూట్యూబ్", "यूट्यूब", "யூடியூப்"]):'''

    # 2. Update _is_os_automation_request
    target_2 = '        # Action verbs\n        action_verbs = ['
    replacement_2 = '''        # Multilingual targets & actions
        multi_targets = [
            "మెయిల్", "మెయిల్స్", "ఈమెయిల్", "వాట్సాప్", "యూట్యూబ్", "కెమెరా", "పాట", "సంగీతం", "వీడియో",
            "ఈమెయిళ్లు", "खोलो", "ओपन", "चलाओ", "ईमेल", "मेल", "व्हाट्सएप", "यूट्यूब", "कैमरा", "गाना", "संगीत", "गीत", "वीडियो",
            "மின்னஞ்சல்", "வாட்ஸ்அப்", "யூடியூப்", "கேமரா", "பாடல்", "இசை", "காணொளி"
        ]
        if any(w in text_lower for w in multi_targets):
            return True

        # Action verbs
        action_verbs = ['''

    if target_1 in content and target_2 in content:
        content = content.replace(target_1, replacement_1, 1)
        content = content.replace(target_2, replacement_2, 1)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('SUCCESS: Updated agent_gateway.py')
    else:
        print('Target strings not found')

if __name__ == '__main__':
    main()

