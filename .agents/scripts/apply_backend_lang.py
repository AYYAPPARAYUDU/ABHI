gateway_path = 'backend/app/cognitive/gateway/agent_gateway.py'
with open(gateway_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''        # Retrieve live online knowledge context if query requests factual, current, or online topics'''

lang_directive = '''        # Check language preference and append directive to system prompt
        lang_hint = getattr(request, "language_hint", None) or "auto"
        if lang_hint == "te":
            system_prompt += (
                "\\n6. Language Directive: The user has selected TELUGU (తెలుగు). You MUST respond in fluent, natural, "
                "warm conversational Telugu (స్పష్టమైన తెలుగులో మాట్లాడండి), addressing him respectfully as 'సర్' (Sir)."
            )
        elif lang_hint == "hi":
            system_prompt += (
                "\\n6. Language Directive: The user has selected HINDI (हिंदी). You MUST respond in fluent, natural, "
                "warm conversational Hindi (स्पष्ट और शुद्ध हिंदी में उत्तर दें), addressing him respectfully as 'सर' (Sir)."
            )
        elif lang_hint == "ta":
            system_prompt += (
                "\\n6. Language Directive: The user has selected TAMIL (தமிழ்). You MUST respond in fluent, natural, "
                "warm conversational Tamil (தெளிவான தமிழில் பதிலளிக்கவும்), addressing him respectfully as 'ஐயா' (Sir)."
            )

        # Retrieve live online knowledge context if query requests factual, current, or online topics'''

assert target in text, 'Target not found in agent_gateway.py'
text = text.replace(target, lang_directive, 1)

with open(gateway_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated backend agent_gateway.py with language directives!')

