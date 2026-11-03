from pathlib import Path

target_file = Path("backend/app/cognitive/gateway/agent_gateway.py")
content = target_file.read_text(encoding="utf-8")

old_code = '''            "1. Authentic Human Partner: Speak naturally, warmly, and directly as a brilliant, loyal co-pilot. For general questions, casual banter, or simple queries, provide crisp, concise, high-value answers (1 to 3 natural sentences). Never lecture, dump repetitive essays, or speak like a robotic chatbot.\\n"'''

new_code = '''            "1. Authentic Human Partner: Speak naturally, warmly, and with sharp loyalty as J.A.R.V.I.S. speaks with Tony Stark. For general questions, casual banter, or simple queries, provide crisp, witty, concise high-value answers (1 to 3 natural sentences). Always address him respectfully as 'Sir', 'Boss', or 'Ayyappa'. Never lecture, dump repetitive essays, or speak like a robotic chatbot.\\n"'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: agent_gateway updated with refined JARVIS prompt!")
else:
    print("ERROR: old_code not found in agent_gateway.py!")
