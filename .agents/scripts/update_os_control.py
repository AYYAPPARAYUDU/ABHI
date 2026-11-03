# 1. Update os_control_engine.py
os_path = 'backend/app/automation/desktop/os_control_engine.py'
with open(os_path, 'r', encoding='utf-8') as f:
    text = f.read()

old_wa_impl = r'''        if self.is_windows:
            try:
                subprocess.Popen(["powershell", "-Command", f"Start-Process '{proto_url}'"], shell=True)
                launched = True
                method_used = "whatsapp_desktop_protocol"
            except Exception as e:
                err = str(e)

            if not launched:
                try:
                    subprocess.Popen(["chrome.exe", web_url], shell=True)
                    launched = True
                    method_used = "browser_whatsapp_web"
                except Exception:
                    try:
                        os.startfile(web_url)
                        launched = True
                        method_used = "default_browser_whatsapp_web"
                    except Exception as e2:
                        err = str(e2)'''

new_wa_impl = r'''        if self.is_windows:
            # Prioritize Chrome where user has active logged-in WhatsApp Web session
            chrome_exe = find_browser_executable("chrome")
            if chrome_exe and os.path.exists(chrome_exe):
                try:
                    clean_exe = chrome_exe.strip('"\'')
                    subprocess.Popen([clean_exe, web_url])
                    launched = True
                    method_used = "chrome_whatsapp_web"
                except Exception as e:
                    err = str(e)

            if not launched:
                try:
                    os.startfile(web_url)
                    launched = True
                    method_used = "default_browser_whatsapp_web"
                except Exception as e2:
                    err = str(e2)

            if not launched:
                try:
                    subprocess.Popen(["powershell", "-Command", f"Start-Process '{proto_url}'"], shell=True)
                    launched = True
                    method_used = "whatsapp_desktop_protocol"
                except Exception as e:
                    err = str(e)'''

assert old_wa_impl in text, 'WhatsApp implementation not found in os_control_engine.py'
text = text.replace(old_wa_impl, new_wa_impl, 1)

with open(os_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated os_control_engine.py!')

# 2. Update communications_assistant.py to remove fake seeds
comms_path = 'backend/app/assistant/communications_assistant.py'
with open(comms_path, 'r', encoding='utf-8') as f:
    c_text = f.read()

old_seeds = r'''    # 4. If table is empty, seed initial dynamic communications trace
    if not stored_msgs:
        seeds = [
            {
                "message_id": "comm_seed_wa_1",
                "channel": "whatsapp",
                "sender": "Lead Project Engineer",
                "recipient": "You",
                "subject": "System Upgrade Milestone",
                "body": "Hi, did the automated verification loop finish on the Windows workstation? Ready to deploy whenever you approve.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reply_status": "pending"
            },
            {
                "message_id": "comm_seed_gm_2",
                "channel": "gmail",
                "sender": "ayparayudu@gmail.com",
                "recipient": "Assistant",
                "subject": "Weekly Autonomous Telemetry Report Request",
                "body": "Please provide the latest cybernetic decision trace summary and resource allocation profile.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reply_status": "pending"
            },
            {
                "message_id": "comm_seed_sms_3",
                "channel": "sms",
                "sender": "+1 (555) 019-2834",
                "recipient": "Mobile",
                "subject": "Server Fleet Notification",
                "body": "Alert: Scheduled hardware maintenance complete. All services operating at nominal efficiency.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "reply_status": "pending"
            }
        ]
        try:
            async with engine.begin() as conn:
                for s in seeds:
                    await conn.execute(
                        text(
                            """
                            INSERT OR IGNORE INTO communications_inbox (
                                message_id, channel, sender, recipient, subject, body, timestamp, reply_status, suggested_replies
                            ) VALUES (
                                :id, :channel, :sender, :recipient, :subject, :body, :ts, :status, '[]'
                            );
                            """
                        ),
                        {
                            "id": s["message_id"],
                            "channel": s["channel"],
                            "sender": s["sender"],
                            "recipient": s["recipient"],
                            "subject": s["subject"],
                            "body": s["body"],
                            "ts": s["timestamp"],
                            "status": s["reply_status"]
                        }
                    )
            stored_msgs = seeds
        except Exception as e:
            logger.error(f"Error seeding initial communications: {e}")'''

new_seeds = r'''    # 4. If table is empty, return empty list without synthetic mock seeds
    # The user's live browser (Chrome) holds active Gmail and WhatsApp Web sessions.'''

assert old_seeds in c_text, 'Seeds not found in communications_assistant.py'
c_text = c_text.replace(old_seeds, new_seeds, 1)

with open(comms_path, 'w', encoding='utf-8') as f:
    f.write(c_text)

print('Updated communications_assistant.py and removed fake seeds!')

