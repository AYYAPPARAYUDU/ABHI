# Update planner.py
planner_path = 'backend/app/cognitive/planner/planner.py'
with open(planner_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update email check in planner.py
old_email = r'''        elif any(e in goal_lower for e in ["email", "gmail", "mail"]) and any(w in goal_lower for w in ["open", "send", "compose", "write", "check", "draft", "inbox"]):
            to = ""
            to_m = re.search(r"(?:to|recipient)\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", goal)
            if to_m:
                to = to_m.group(1).strip()
            subject = "Message from ABHI"
            sub_m = re.search(r"(?:subject|about)\s+['\"]?([^'\"]+)['\"]?", goal, re.IGNORECASE)
            if sub_m:
                subject = sub_m.group(1).strip()
            body = ""
            body_m = re.search(r"(?:body|saying|text|message)\s+['\"]?(.+?)['\"]?$", goal, re.IGNORECASE)
            if body_m:
                body = body_m.group(1).strip()

            if not to and not body and subject == "Message from ABHI":
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Open Gmail Inbox",
                    agent_id="os_desktop_agent",
                    action="open_url",
                    params={"url": "https://mail.google.com", "browser": "chrome"},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Open Gmail & Compose: {to or 'Draft'}",
                    agent_id="os_desktop_agent",
                    action="open_email",
                    params={"to": to, "subject": subject, "body": body, "use_gmail": True},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )'''

new_email = r'''        elif any(e in goal_lower for e in ["email", "gmail", "mail", "mails", "inbox"]):
            to = ""
            to_m = re.search(r"(?:to|recipient)\s+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", goal)
            if to_m:
                to = to_m.group(1).strip()
            subject = "Message from ABHI"
            sub_m = re.search(r"(?:subject|about)\s+['\"]?([^'\"]+)['\"]?", goal, re.IGNORECASE)
            if sub_m:
                subject = sub_m.group(1).strip()
            body = ""
            body_m = re.search(r"(?:body|saying|text|message)\s+['\"]?(.+?)['\"]?$", goal, re.IGNORECASE)
            if body_m:
                body = body_m.group(1).strip()

            is_compose = bool(to or body or any(w in goal_lower for w in ["compose", "write", "send", "draft"]))
            if not is_compose:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Open Gmail Inbox in Browser",
                    agent_id="os_desktop_agent",
                    action="open_url",
                    params={"url": "https://mail.google.com", "browser": "chrome"},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Open Gmail & Compose: {to or 'Draft'}",
                    agent_id="os_desktop_agent",
                    action="open_email",
                    params={"to": to, "subject": subject, "body": body, "use_gmail": True},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )'''

assert old_email in text, 'Email block not found in planner.py'
text = text.replace(old_email, new_email, 1)

# 2. Update WhatsApp block in planner.py
old_wa = r'''        elif any(w in goal_lower for w in ["whatsapp", "personal message", "personal messge", "send mesage", "send message"]):
            message = "hi and hello this is abhi"
            msg_match = re.search(r"""(?:saying|message|personal message|personal messge|text|content)\s+['"]?(.+?)['"]?$""", goal, re.IGNORECASE)
            if msg_match:
                extracted = msg_match.group(1).strip()
                extracted = re.split(r"\b(do this|and test|test it|opening any|check all|make it)\b", extracted, flags=re.IGNORECASE)[0].strip()
                if extracted:
                    message = extracted

            phone = None
            phone_match = re.search(r"(?:to|phone|number)\s+([+]?\d{7,15})", goal)
            if phone_match:
                phone = phone_match.group(1).strip()

            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title=f"Open WhatsApp: {phone or 'Personal'}",
                agent_id="os_desktop_agent",
                action="open_whatsapp",
                params={"message": message, "phone": phone},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )
            nodes["step_2"] = DAGNode(
                node_id="step_2",
                title=f"Deliver Message: {message[:30]}",
                agent_id="os_desktop_agent",
                action="send_whatsapp_message",
                params={"message": message, "phone": phone},
                dependencies=["step_1"],
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )'''

new_wa = r'''        elif any(w in goal_lower for w in ["whatsapp", "web.whatsapp"]):
            has_send_intent = any(s in goal_lower for s in ["send", "text", "deliver", "message to"])
            phone = None
            phone_match = re.search(r"(?:to|phone|number)\s+([+]?\d{7,15})", goal)
            if phone_match:
                phone = phone_match.group(1).strip()

            if not has_send_intent and not phone:
                # User asked to open/check/read WhatsApp -> Launch WhatsApp Web in browser where user is logged in
                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title="Open WhatsApp Web in Browser",
                    agent_id="os_desktop_agent",
                    action="open_url",
                    params={"url": "https://web.whatsapp.com", "browser": "chrome"},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
            else:
                message = "hi and hello this is abhi"
                msg_match = re.search(r"""(?:saying|message|personal message|personal messge|text|content)\s+['"]?(.+?)['"]?$""", goal, re.IGNORECASE)
                if msg_match:
                    extracted = msg_match.group(1).strip()
                    extracted = re.split(r"\b(do this|and test|test it|opening any|check all|make it)\b", extracted, flags=re.IGNORECASE)[0].strip()
                    if extracted:
                        message = extracted

                nodes["step_1"] = DAGNode(
                    node_id="step_1",
                    title=f"Open WhatsApp: {phone or 'Personal'}",
                    agent_id="os_desktop_agent",
                    action="open_whatsapp",
                    params={"message": message, "phone": phone},
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )
                nodes["step_2"] = DAGNode(
                    node_id="step_2",
                    title=f"Deliver Message: {message[:30]}",
                    agent_id="os_desktop_agent",
                    action="send_whatsapp_message",
                    params={"message": message, "phone": phone},
                    dependencies=["step_1"],
                    risk_tier="Tier 1",
                    status=NodeStatus.PENDING
                )

        elif any(m in goal_lower for m in ["messages", "message", "notifications", "notification"]):
            # General messages / communications check -> open Gmail and communications hub
            nodes["step_1"] = DAGNode(
                node_id="step_1",
                title="Open Gmail & Communications in Browser",
                agent_id="os_desktop_agent",
                action="open_url",
                params={"url": "https://mail.google.com", "browser": "chrome"},
                risk_tier="Tier 1",
                status=NodeStatus.PENDING
            )'''

assert old_wa in text, 'WhatsApp block not found in planner.py'
text = text.replace(old_wa, new_wa, 1)

with open(planner_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated planner.py successfully!')
