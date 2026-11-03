gateway_path = 'backend/app/cognitive/gateway/agent_gateway.py'
with open(gateway_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update desktop_targets and action_verbs
old_targets = '''        # Known desktop target keywords
        desktop_targets = [
            "notepad", "calculator", "calc", "terminal", "powershell", "cmd", "command prompt",
            "browser", "chrome", "edge", "settings", "vs code", "vscode", "explorer", "screen",
            "screenshot", "folder", "directory", "process", "app", "application", "window", "whatsapp",
            "youtube", "camera", "webcam", "spotify", "gmail", "mail", "instagram", "maps", "volume",
            "phone", "mobile", "android", "cellphone", "smartphone", "device",
            "song", "music", "track", "audio", "video", "playlist"
        ]

        # Action verbs
        action_verbs = [
            "open", "launch", "start", "run", "execute", "close", "kill", "terminate",
            "play", "play song", "play music", "stream", "listen to",
            "screenshot", "capture screen", "take screenshot", "lock workstation", "lock screen",
            "volume up", "volume down", "adjust volume", "mute", "unmute", "create folder",
            "make folder", "mkdir", "build file", "create directory", "dial", "call", "tap",
            "swipe", "connect"
        ]'''

new_targets = '''        # Known desktop target keywords
        desktop_targets = [
            "notepad", "calculator", "calc", "terminal", "powershell", "cmd", "command prompt",
            "browser", "chrome", "edge", "settings", "vs code", "vscode", "explorer", "screen",
            "screenshot", "folder", "directory", "process", "app", "application", "window", "whatsapp",
            "youtube", "camera", "webcam", "spotify", "gmail", "mail", "mails", "email", "emails", "inbox",
            "message", "messages", "chat", "chats", "notification", "notifications", "instagram", "maps", "volume",
            "phone", "mobile", "android", "cellphone", "smartphone", "device",
            "song", "music", "track", "audio", "video", "playlist"
        ]

        # Action verbs
        action_verbs = [
            "open", "launch", "start", "run", "execute", "close", "kill", "terminate",
            "read", "check", "see", "show", "view", "inspect", "get", "fetch", "browse", "navigate",
            "play", "play song", "play music", "stream", "listen to",
            "screenshot", "capture screen", "take screenshot", "lock workstation", "lock screen",
            "volume up", "volume down", "adjust volume", "mute", "unmute", "create folder",
            "make folder", "mkdir", "build file", "create directory", "dial", "call", "tap",
            "swipe", "connect"
        ]'''

assert old_targets in text, 'Targets not found in agent_gateway.py'
text = text.replace(old_targets, new_targets, 1)

# 2. Add has_comm_action right after has_polite_open
old_polite = '''        if has_polite_open:
            return True'''

new_polite = '''        if has_polite_open:
            return True

        # 0.1 Communications, web & browser automation intent (read mails, check whatsapp, open browser)
        has_comm_action = any(v in text_lower for v in [
            "read", "check", "open", "show", "view", "see", "get", "fetch", "launch", "display"
        ]) and any(t in text_lower for t in [
            "mail", "mails", "gmail", "email", "emails", "inbox", "whatsapp", "message", "messages", "chat", "chats", "notifications"
        ])
        if has_comm_action:
            return True'''

assert old_polite in text, 'Polite open not found in agent_gateway.py'
text = text.replace(old_polite, new_polite, 1)

# 3. Update user_msg formatting for multilingual support
old_msg = '''        elif any(m in lower_g for m in ["gmail", "email", "mail"]):
            user_msg = "Opening Gmail inbox, Sir."'''

new_msg = '''        elif any(m in lower_g for m in ["gmail", "email", "mail", "mails", "inbox"]):
            lang = getattr(request, "language_hint", "auto")
            if lang == "te":
                user_msg = "మీ Gmail ఇన్‌బాక్స్‌ను బ్రౌజర్‌లో తెరుస్తున్నాను, సర్."
            elif lang == "hi":
                user_msg = "आपके ब्राउज़र में Gmail इनबॉक्स खोल रहा हूँ, सर।"
            elif lang == "ta":
                user_msg = "உங்கள் பிரவுசரில் ஜிமெயில் திறக்கிறேன், ஐயா."
            else:
                user_msg = "Opening your Gmail inbox in your browser, Sir."
        elif "whatsapp" in lower_g:
            lang = getattr(request, "language_hint", "auto")
            if lang == "te":
                user_msg = "మీ WhatsApp ను బ్రౌజర్‌లో తెరుస్తున్నాను, సర్."
            elif lang == "hi":
                user_msg = "आपके ब्राउज़र में WhatsApp खोल रहा हूँ, सर।"
            elif lang == "ta":
                user_msg = "உங்கள் வாட்ஸ்அப் திறக்கிறேன், ஐயா."
            else:
                user_msg = "Opening WhatsApp Web in your browser, Sir."'''

assert old_msg in text, 'Old msg not found in agent_gateway.py'
text = text.replace(old_msg, new_msg, 1)

with open(gateway_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated agent_gateway.py successfully!')

