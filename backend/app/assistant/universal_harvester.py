"""Universal Communications & Mobile Harvester Engine.

Collects authentic communications from any channel:
1. Connected Android Device (POCO 22101320I over Wi-Fi ADB):
   - SMS Inbox (Banking, UPI settlements, OTPs, telecom alerts)
   - Call logs & Call availability SMS
   - Real-time mobile notifications (WhatsApp, Gmail, System)
2. Email Channels:
   - Direct IMAP fetcher (imap.gmail.com:993 for ayyapparayudu.ravuvari@gmail.com)
   - Mobile Gmail application dumpsys & notifications
   - Inbound webhook/API ingestion
3. Global RAG & Agentic Swarm Knowledge Ingestion:
   - Vectorizes communications and embeds into LanceDB and project_data/intelligence/vector_store.json
   - Accessible by all LLMs (Ollama DeepSeek-R1, Qwen 8B), Swarm Agents (Olivia, Leo, Max, Mia, Sam),
     and n8n automation workflows anywhere in the system.
"""

import asyncio
from datetime import datetime, timezone
import email
from email.header import decode_header
import imaplib
import json
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import text

from backend.app.automation.mobile.adb_controller import adb_controller
from backend.app.business.credential_vault import credential_vault
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.llm.abhi_llm import abhi_llm
from backend.app.services.memory.database import engine
from backend.app.services.rag.vector_store import LocalVectorStore


class UniversalCommunicationsHarvester:
    """Authoritative Harvester for Sovereign Operator (Mamu) Communications & Mobile Data."""

    OPERATOR_EMAIL = "ayyapparayudu.ravuvari@gmail.com"
    OPERATOR_PHONE = "+91 9390598938"
    POCO_SERIAL = "10.65.249.121:5555"

    def __init__(self):
        self._is_syncing = False
        self._last_sync_ts = 0.0
        self._vector_store: Optional[LocalVectorStore] = None
        self._running_daemon = False

    @property
    def vector_store(self) -> LocalVectorStore:
        if self._vector_store is None:
            self._vector_store = LocalVectorStore()
        return self._vector_store

    async def ensure_db_schema(self) -> None:
        """Ensure communications_inbox table has all required columns."""
        async with engine.begin() as conn:
            for col_def in [
                "category TEXT DEFAULT 'all'",
                "amount_inr REAL",
                "utr TEXT",
                "otp_code TEXT",
                "account TEXT"
            ]:
                try:
                    await conn.execute(text(f"ALTER TABLE communications_inbox ADD COLUMN {col_def};"))
                except Exception:
                    pass

    async def harvest_mobile_data(self, limit: int = 120) -> List[Dict[str, Any]]:
        """Harvest authentic SMS, banking transactions, OTPs, and call logs from connected POCO phone."""
        harvested: List[Dict[str, Any]] = []

        try:
            # 1. Query Banking SMS and regular messages via ADB controller
            sms_data = await adb_controller.get_bank_sms_and_transactions(serial=self.POCO_SERIAL, limit=limit)
            raw_msgs = sms_data.get("raw_messages", [])

            for m in raw_msgs:
                sender = m.get("sender", "UNKNOWN")
                body = m.get("body", "")
                ts = m.get("timestamp") or datetime.now(timezone.utc).isoformat()
                is_fin = bool(m.get("is_financial"))
                is_otp = bool(m.get("is_otp"))

                if is_fin:
                    cat = "banking"
                    subj = f"Banking Alert: {sender}"
                elif is_otp:
                    cat = "otp"
                    subj = f"Security OTP: {sender}"
                elif sender.startswith("+") or sender.isdigit() or "call" in body.lower():
                    cat = "calls"
                    subj = f"Call / Mobile Alert: {sender}"
                else:
                    cat = "sms"
                    subj = f"SMS: {sender}"

                msg_id = f"sms_{abs(hash(sender + body + str(ts))) % 100000000}"
                harvested.append({
                    "message_id": msg_id,
                    "channel": "sms",
                    "sender": sender,
                    "recipient": "Mamu",
                    "subject": subj,
                    "body": body,
                    "timestamp": ts,
                    "reply_status": "verified",
                    "category": cat,
                    "amount_inr": m.get("amount_inr"),
                    "utr": m.get("utr"),
                    "otp_code": m.get("otp_code"),
                    "account": m.get("account")
                })
        except Exception as e:
            logger.debug(f"Mobile SMS harvest note: {e}")

        # 2. Query Call Logs from Android content provider
        try:
            code, out, _ = await adb_controller.run_adb([
                "shell", "content", "query", "--uri", "content://call_log/calls",
                "--projection", "number,name,date,duration,type"
            ], serial=self.POCO_SERIAL, timeout=6.0)

            if code == 0 and out:
                row_blocks = out.split("Row: ")
                for b in row_blocks[1:25]:
                    num_match = re.search(r'number=([^,\n\r]+)', b)
                    name_match = re.search(r'name=([^,\n\r]+)', b)
                    date_match = re.search(r'date=(\d+)', b)
                    type_match = re.search(r'type=(\d+)', b)

                    if num_match:
                        num = num_match.group(1).strip()
                        c_name = name_match.group(1).strip() if (name_match and name_match.group(1).strip() != "NULL") else num
                        ts_ms = int(date_match.group(1)) if date_match else None
                        call_type = type_match.group(1).strip() if type_match else "1"

                        # Type: 1 = Incoming, 2 = Outgoing, 3 = Missed
                        type_label = "Missed Call" if call_type == "3" else ("Incoming Call" if call_type == "1" else "Outgoing Call")
                        iso_ts = datetime.fromtimestamp(ts_ms / 1000.0, tz=timezone.utc).isoformat() if ts_ms else datetime.now(timezone.utc).isoformat()

                        cid = f"call_{abs(hash(num + str(ts_ms))) % 100000000}"
                        harvested.append({
                            "message_id": cid,
                            "channel": "call",
                            "sender": c_name,
                            "recipient": "Mamu",
                            "subject": f"{type_label} from {c_name}",
                            "body": f"{type_label} registered on POCO phone. Phone Number: {num}.",
                            "timestamp": iso_ts,
                            "reply_status": "verified",
                            "category": "calls",
                            "amount_inr": None,
                            "utr": None,
                            "otp_code": None,
                            "account": None
                        })
        except Exception as e:
            logger.debug(f"Call log harvest note: {e}")

        return harvested

    async def harvest_emails(self, max_emails: int = 15) -> List[Dict[str, Any]]:
        """Harvest emails via IMAP (imap.gmail.com) or active Android Gmail notifications."""
        emails: List[Dict[str, Any]] = []

        # 1. Attempt standard secure IMAP connection if credentials are configured
        imap_pwd = os.environ.get("GMAIL_APP_PASSWORD")
        if not imap_pwd:
            try:
                cred = credential_vault.get_credential("cred_google_workspace")
                if cred and cred.secret_value and cred.secret_value != self.OPERATOR_EMAIL:
                    imap_pwd = cred.secret_value
            except Exception:
                pass

        if imap_pwd:
            try:
                mail = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=6)
                mail.login(self.OPERATOR_EMAIL, imap_pwd)
                mail.select("INBOX")
                _, data = mail.search(None, "ALL")
                mail_ids = data[0].split()

                recent_ids = mail_ids[-max_emails:] if len(mail_ids) > max_emails else mail_ids
                for mid in reversed(recent_ids):
                    _, msg_data = mail.fetch(mid, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            subject, encoding = decode_header(msg.get("Subject", "No Subject"))[0]
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding or "utf-8", errors="replace")
                            from_hdr = msg.get("From", "Unknown Sender")
                            date_hdr = msg.get("Date", "")

                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    ctype = part.get_content_type()
                                    cdispo = str(part.get("Content-Disposition"))
                                    if ctype == "text/plain" and "attachment" not in cdispo:
                                        body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                                        break
                            else:
                                body = msg.get_payload(decode=True).decode("utf-8", errors="replace")

                            body_clean = body.strip()[:400]
                            mid_hash = f"email_{abs(hash(from_hdr + subject + str(mid))) % 100000000}"
                            emails.append({
                                "message_id": mid_hash,
                                "channel": "gmail",
                                "sender": from_hdr,
                                "recipient": self.OPERATOR_EMAIL,
                                "subject": subject,
                                "body": body_clean,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                                "reply_status": "pending",
                                "category": "mail",
                                "amount_inr": None,
                                "utr": None,
                                "otp_code": None,
                                "account": None
                            })
                mail.logout()
            except Exception as e:
                logger.debug(f"IMAP email fetch note: {e}")

        # 2. Extract Gmail notifications from POCO phone via ADB
        try:
            code, out, _ = await adb_controller.run_adb(["shell", "dumpsys", "notification"], serial=self.POCO_SERIAL, timeout=5.0)
            if code == 0 and out:
                gm_blocks = [b for b in out.split("NotificationRecord(") if "google.android.gm" in b or "email" in b.lower()]
                for b in gm_blocks:
                    t_match = re.search(r"android\.title=String\s*\((.*?)\)", b)
                    txt_match = re.search(r"android\.text=String\s*\((.*?)\)", b) or re.search(r"android\.bigText=String\s*\((.*?)\)", b)
                    sub_match = re.search(r"android\.subText=String\s*\((.*?)\)", b)

                    sender = t_match.group(1).strip() if t_match else "Gmail Contact"
                    body = txt_match.group(1).strip() if txt_match else "New email received"
                    account = sub_match.group(1).strip() if sub_match else self.OPERATOR_EMAIL

                    eid = f"gm_{abs(hash(sender + body)) % 100000000}"
                    emails.append({
                        "message_id": eid,
                        "channel": "gmail",
                        "sender": sender,
                        "recipient": account,
                        "subject": f"Email from {sender}",
                        "body": body,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "reply_status": "pending",
                        "category": "mail",
                        "amount_inr": None,
                        "utr": None,
                        "otp_code": None,
                        "account": None
                    })
        except Exception as e:
            logger.debug(f"ADB Gmail notification harvest note: {e}")

        return emails

    async def harvest_whatsapp_data(self) -> List[Dict[str, Any]]:
        """Harvest WhatsApp communications:
        1. From connected Android POCO phone via ADB dumpsys notification (com.whatsapp).
        2. Fallback to local persistent communications_inbox if mobile is offline.
        """
        wa_messages: List[Dict[str, Any]] = []

        # 1. Harvest WhatsApp notifications from Android POCO phone via ADB
        try:
            code, out, _ = await adb_controller.run_adb(
                ["shell", "dumpsys", "notification"],
                serial=self.POCO_SERIAL,
                timeout=5.0
            )
            if code == 0 and out:
                wa_blocks = [b for b in out.split("NotificationRecord(") if "com.whatsapp" in b]
                for b in wa_blocks:
                    t_match = re.search(r"android\.title=String\s*\((.*?)\)", b)
                    txt_match = re.search(r"android\.text=String\s*\((.*?)\)", b) or re.search(r"android\.bigText=String\s*\((.*?)\)", b)
                    sub_match = re.search(r"android\.subText=String\s*\((.*?)\)", b)
                    time_match = re.search(r"postTime=(\d+)", b)

                    sender = t_match.group(1).strip() if t_match else "WhatsApp Contact"
                    body = txt_match.group(1).strip() if txt_match else "New WhatsApp message"
                    chat_context = sub_match.group(1).strip() if sub_match else "WhatsApp"

                    # Skip empty system or generic notifications
                    if sender in ["WhatsApp", "Checking for new messages", "Backup in progress", "WhatsApp Web is currently active"]:
                        continue

                    ts = datetime.now(timezone.utc).isoformat()
                    if time_match:
                        try:
                            ts = datetime.fromtimestamp(int(time_match.group(1)) / 1000.0, tz=timezone.utc).isoformat()
                        except Exception:
                            pass

                    wid = f"wa_{abs(hash(sender + body + str(ts))) % 100000000}"
                    wa_messages.append({
                        "message_id": wid,
                        "channel": "whatsapp",
                        "sender": sender,
                        "recipient": "Mamu",
                        "subject": f"WhatsApp from {sender} ({chat_context})",
                        "body": body,
                        "timestamp": ts,
                        "reply_status": "pending",
                        "category": "whatsapp",
                        "amount_inr": None,
                        "utr": None,
                        "otp_code": None,
                        "account": None
                    })
        except Exception as e:
            logger.debug(f"ADB WhatsApp notification harvest note: {e}")

        # 2. If mobile is offline or 0 new messages found, retrieve cached WhatsApp history from SQLite
        if not wa_messages:
            try:
                async with engine.connect() as conn:
                    res = await conn.execute(
                        text("""
                            SELECT message_id, channel, sender, recipient, subject, body, timestamp, reply_status
                            FROM communications_inbox
                            WHERE channel = 'whatsapp' OR category = 'whatsapp'
                            ORDER BY timestamp DESC
                            LIMIT 20;
                        """)
                    )
                    rows = res.fetchall()
                    for r in rows:
                        wa_messages.append({
                            "message_id": r[0],
                            "channel": r[1],
                            "sender": r[2],
                            "recipient": r[3],
                            "subject": r[4],
                            "body": r[5],
                            "timestamp": r[6],
                            "reply_status": r[7],
                            "category": "whatsapp",
                            "amount_inr": None,
                            "utr": None,
                            "otp_code": None,
                            "account": None
                        })
            except Exception as e:
                logger.debug(f"WhatsApp local fallback note: {e}")

        return wa_messages

    async def persist_and_vectorize(self, messages: List[Dict[str, Any]]) -> int:
        """Persist messages in SQLite communications_inbox and embed into Global RAG Vector Knowledge Store."""
        if not messages:
            return 0

        await self.ensure_db_schema()

        # 1. Upsert into SQLite
        try:
            async with engine.begin() as conn:
                for m in messages:
                    await conn.execute(
                        text(
                            """
                            INSERT INTO communications_inbox (
                                message_id, channel, sender, recipient, subject, body, timestamp, reply_status,
                                suggested_replies, category, amount_inr, utr, otp_code, account
                            ) VALUES (
                                :id, :channel, :sender, :recipient, :subject, :body, :ts, :reply_status,
                                '[]', :cat, :amt, :utr, :otp, :acc
                            )
                            ON CONFLICT(message_id) DO UPDATE SET
                                category = excluded.category,
                                amount_inr = excluded.amount_inr,
                                utr = excluded.utr,
                                otp_code = excluded.otp_code,
                                account = excluded.account;
                            """
                        ),
                        {
                            "id": m["message_id"],
                            "channel": m.get("channel", "sms"),
                            "sender": m.get("sender", "UNKNOWN"),
                            "recipient": m.get("recipient", "Mamu"),
                            "subject": m.get("subject", ""),
                            "body": m.get("body", ""),
                            "ts": m.get("timestamp", datetime.now(timezone.utc).isoformat()),
                            "reply_status": m.get("reply_status", "verified"),
                            "cat": m.get("category", "all"),
                            "amt": m.get("amount_inr"),
                            "utr": m.get("utr"),
                            "otp": m.get("otp_code"),
                            "acc": m.get("account")
                        }
                    )
        except Exception as e:
            logger.warning(f"Error persisting harvested communications: {e}")

        # 2. Vectorize and Ingest into LanceDB & project_data/intelligence/vector_store.json
        vector_items_count = 0
        try:
            json_file_path = os.path.join(r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI", "project_data", "intelligence", "vector_store.json")
            existing_docs = []
            if os.path.exists(json_file_path):
                try:
                    with open(json_file_path, "r", encoding="utf-8") as jf:
                        existing_docs = json.load(jf)
                except Exception:
                    existing_docs = []

            existing_ids = {d.get("doc_id") for d in existing_docs}

            for m in messages:
                doc_id = f"vec_comm_{m['message_id']}"
                if doc_id in existing_ids:
                    continue

                cat_tag = (m.get("category") or "COMMUNICATION").upper()
                amt_str = f" Amount: INR {m.get('amount_inr')}." if m.get("amount_inr") is not None else ""
                utr_str = f" UTR: {m.get('utr')}." if m.get("utr") else ""
                acc_str = f" Account: {m.get('account')}." if m.get("account") else ""
                otp_str = f" OTP Code: {m.get('otp_code')}." if m.get("otp_code") else ""

                content_text = (
                    f"[{cat_tag}] Source: {m.get('channel', 'mobile').upper()}. Sender: {m.get('sender')}. "
                    f"Date: {m.get('timestamp')}. Content: \"{m.get('body')}\".{amt_str}{utr_str}{acc_str}{otp_str}"
                )

                # Ingest into LanceDB
                await self.vector_store.ingest_document(
                    source=f"Mobile Communication ({m.get('sender')})",
                    content=content_text,
                    tags=f"COMMUNICATIONS,{cat_tag},{m.get('channel', 'sms').upper()}"
                )

                # Append to persistent JSON for cross-tool RAG
                existing_docs.append({
                    "doc_id": doc_id,
                    "title": f"Live Communication: {m.get('sender')}",
                    "content": content_text,
                    "category": cat_tag,
                    "vector": self.vector_store._generate_embedding(content_text)
                })
                existing_ids.add(doc_id)
                vector_items_count += 1

            if vector_items_count > 0:
                with open(json_file_path, "w", encoding="utf-8") as jf:
                    json.dump(existing_docs, jf, indent=2)
                logger.info(f"Ingested {vector_items_count} live communication records into Global RAG Vector Knowledge Base.")
        except Exception as e:
            logger.warning(f"Error vectorizing communications into RAG: {e}")

        return len(messages)

    async def sync_all(self) -> Dict[str, Any]:
        """Perform full unified sync across mobile SMS, call logs, phone notifications, WhatsApp, and emails."""
        if self._is_syncing:
            return {"status": "IN_PROGRESS", "message": "Synchronization cycle already running."}

        self._is_syncing = True
        try:
            # 1. Harvest mobile SMS, bank transactions, and calls
            mobile_msgs = await self.harvest_mobile_data(limit=100)

            # 2. Harvest emails
            email_msgs = await self.harvest_emails(max_emails=20)

            # 3. Harvest WhatsApp (from phone ADB or desktop/local cache)
            wa_msgs = await self.harvest_whatsapp_data()

            all_msgs = mobile_msgs + email_msgs + wa_msgs
            persisted = await self.persist_and_vectorize(all_msgs)

            self._last_sync_ts = time.time()
            return {
                "success": True,
                "total_harvested": len(all_msgs),
                "mobile_count": len(mobile_msgs),
                "email_count": len(email_msgs),
                "whatsapp_count": len(wa_msgs),
                "persisted_count": persisted,
                "synced_at": datetime.now(timezone.utc).isoformat()
            }
        finally:
            self._is_syncing = False

    async def generate_daily_executive_briefing(self) -> Dict[str, Any]:
        """Generate structured 3-Tier Sovereign Executive Briefing:
        Tier 1: Basic Data Summary (Counts: Messages, Emails, Calls, Missed Calls, WhatsApp, Banking)
        Tier 2: Important & Priority Items (High-value debits/credits, active OTPs, VIP emails, missed calls)
        Tier 3: Dynamic Drilldown & Specific Inquiries (Direct figures, one-click actions, interactive intelligence)
        """
        await self.ensure_db_schema()

        # Query recent communications from SQLite WAL
        records: List[Dict[str, Any]] = []
        try:
            async with engine.connect() as conn:
                res = await conn.execute(
                    text("""
                        SELECT message_id, channel, sender, recipient, subject, body, timestamp, reply_status,
                               category, amount_inr, utr, otp_code, account
                        FROM communications_inbox
                        WHERE message_id NOT IN ('test_msg_001')
                        ORDER BY timestamp DESC
                        LIMIT 120;
                    """)
                )
                for r in res.fetchall():
                    records.append({
                        "message_id": r[0],
                        "channel": r[1],
                        "sender": r[2],
                        "recipient": r[3],
                        "subject": r[4] or "",
                        "body": r[5] or "",
                        "timestamp": r[6],
                        "reply_status": r[7],
                        "category": r[8] or "all",
                        "amount_inr": r[9],
                        "utr": r[10],
                        "otp_code": r[11],
                        "account": r[12]
                    })
        except Exception as e:
            logger.error(f"Error reading communications for daily briefing: {e}")

        # TIER 1: Basic Data Summary Counts
        total_messages = len(records)
        whatsapp_records = [r for r in records if r["channel"] == "whatsapp" or r["category"] == "whatsapp"]
        email_records = [r for r in records if r["channel"] in ["gmail", "email"] or r["category"] == "mail"]
        call_records = [r for r in records if r["channel"] == "call" or r["category"] == "calls"]
        missed_call_records = [
            r for r in call_records
            if "missed" in r["subject"].lower() or "missed" in r["body"].lower()
        ]
        banking_records = [
            r for r in records
            if r["category"] == "banking" or r["amount_inr"] is not None or bool(r["utr"])
        ]
        otp_records = [
            r for r in records
            if r["category"] == "otp" or bool(r["otp_code"])
        ]

        tier_1_summary = {
            "total_communications": total_messages,
            "whatsapp_count": len(whatsapp_records),
            "email_count": len(email_records),
            "calls_count": len(call_records),
            "missed_calls_count": len(missed_call_records),
            "banking_count": len(banking_records),
            "otp_count": len(otp_records),
            "headline": f"Daily Briefing: {total_messages} communications ({len(whatsapp_records)} WhatsApp, {len(email_records)} Emails, {len(call_records)} Calls with {len(missed_call_records)} Missed, {len(banking_records)} Banking alerts)"
        }

        # TIER 2: Important & Priority Items
        priority_items: List[Dict[str, Any]] = []

        # 1. Financial debits/credits (Highest urgency)
        for b in banking_records[:6]:
            amt_str = f"₹{b['amount_inr']:,.2f}" if b['amount_inr'] is not None else "Amount recorded"
            priority_items.append({
                "type": "FINANCIAL_ALERT",
                "urgency": "HIGH",
                "title": f"Banking Transaction ({amt_str})",
                "sender": b["sender"],
                "amount": b["amount_inr"],
                "utr": b["utr"],
                "account": b["account"],
                "body": b["body"],
                "timestamp": b["timestamp"],
                "action_label": "Copy UTR" if b["utr"] else "View Details"
            })

        # 2. Security OTPs
        for o in otp_records[:4]:
            priority_items.append({
                "type": "SECURITY_OTP",
                "urgency": "CRITICAL",
                "title": f"Security OTP ({o.get('otp_code') or 'Code Required'})",
                "sender": o["sender"],
                "otp_code": o.get("otp_code"),
                "body": o["body"],
                "timestamp": o["timestamp"],
                "action_label": "Copy OTP"
            })

        # 3. Missed Calls
        for mc in missed_call_records[:4]:
            priority_items.append({
                "type": "MISSED_CALL",
                "urgency": "HIGH",
                "title": f"Missed Call from {mc['sender']}",
                "sender": mc["sender"],
                "body": mc["body"],
                "timestamp": mc["timestamp"],
                "action_label": "Call Back"
            })

        # 4. WhatsApp Messages
        for w in whatsapp_records[:4]:
            priority_items.append({
                "type": "WHATSAPP_MESSAGE",
                "urgency": "MEDIUM",
                "title": f"WhatsApp from {w['sender']}",
                "sender": w["sender"],
                "body": w["body"],
                "timestamp": w["timestamp"],
                "action_label": "Open WhatsApp"
            })

        # 5. Important Emails
        for em in email_records[:4]:
            priority_items.append({
                "type": "EMAIL_INBOX",
                "urgency": "MEDIUM",
                "title": em["subject"] or f"Email from {em['sender']}",
                "sender": em["sender"],
                "body": em["body"],
                "timestamp": em["timestamp"],
                "action_label": "Open in Gmail"
            })

        # TIER 3: Executive Briefing Text Synthesis
        briefing_text = (
            f"**[TIER 1 • EXECUTIVE SUMMARY]**\n"
            f"Good day, Sovereign Operator Mamu. Here is your synthesized communication briefing:\n"
            f"• **Total Communications Logged**: {total_messages}\n"
            f"• **WhatsApp Messages**: {len(whatsapp_records)} active conversations\n"
            f"• **Emails & Gmail**: {len(email_records)} messages received\n"
            f"• **Voice Calls**: {len(call_records)} total ({len(missed_call_records)} missed calls)\n"
            f"• **Banking & UPI Alerts**: {len(banking_records)} financial alerts\n"
            f"• **Active Security OTPs**: {len(otp_records)} verification codes\n\n"
            f"**[TIER 2 • HIGH-PRIORITY ITEMS REQUIRING ATTENTION]**\n"
        )

        if banking_records:
            first_b = banking_records[0]
            amt_label = f"₹{first_b['amount_inr']:,.2f}" if first_b.get("amount_inr") is not None else "transaction"
            briefing_text += f"1. 🏦 **Banking Alert**: {first_b['sender']} - {amt_label}. UTR: `{first_b.get('utr') or 'N/A'}`.\n"

        if otp_records:
            first_o = otp_records[0]
            briefing_text += f"2. 🔐 **Latest Security OTP**: `{first_o.get('otp_code') or 'Code'}` from {first_o['sender']}.\n"

        if missed_call_records:
            first_mc = missed_call_records[0]
            briefing_text += f"3. 📞 **Urgent Missed Call**: From {first_mc['sender']} on your POCO mobile.\n"

        if whatsapp_records:
            first_wa = whatsapp_records[0]
            briefing_text += f"4. 💬 **Recent WhatsApp**: From {first_wa['sender']}: \"{first_wa['body'][:80]}...\".\n"

        briefing_text += (
            f"\n**[TIER 3 • DYNAMIC DRILL-DOWN & DIRECT COMMANDS]**\n"
            f"You can ask me for any specific detail (e.g. *'Show my SBI transactions'*, *'What is the OTP for Jio?'*, *'Did Dheenu reply on WhatsApp?'*) "
            f"or use the one-click action buttons below to reply or dial."
        )

        return {
            "success": True,
            "briefing_text": briefing_text,
            "tier_1_summary": tier_1_summary,
            "tier_2_priority_items": priority_items,
            "tier_3_suggested_queries": [
                "What is my latest ICICI or SBI transaction?",
                "Show my latest security OTP",
                "Who called me today?",
                "Show all unread WhatsApp chats",
                "Give me a detailed email summary"
            ],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    async def query_intelligence(self, user_query: str) -> Dict[str, Any]:
        """Query communication memory using LanceDB Hybrid Vector Search and Local Ollama / Standalone LLM.
        Directly detects daily briefing/update requests and provides structured 3-tier intelligence.
        """
        # Check if user is asking for general daily update, briefing, or summary of messages/calls/mails
        is_briefing_request = bool(
            re.search(
                r'\b(update|briefing|summary|what happened|read my message|read my messages|daily update|status of messages|how many messages|check messages|calls and mails|mails and calls)\b',
                user_query,
                re.IGNORECASE
            )
        )

        daily_briefing = None
        if is_briefing_request:
            daily_briefing = await self.generate_daily_executive_briefing()

        # 1. Search vector store for relevant context
        search_results = await self.vector_store.hybrid_search(
            query=user_query,
            top_k=6
        )

        context_blocks = []
        for r in search_results:
            context_blocks.append(f"- [{r.source}] {r.text} (Score: {r.score:.3f})")

        joined_context = "\n".join(context_blocks) if context_blocks else "No matching communication records found."

        # If user asked for daily update/briefing, provide the authoritative 3-tier briefing directly
        if is_briefing_request and daily_briefing:
            return {
                "query": user_query,
                "answer": daily_briefing["briefing_text"],
                "thinking": "Structured 3-Tier Executive Briefing generated from SQLite WAL records & live device telemetry.",
                "is_daily_briefing": True,
                "briefing_data": daily_briefing,
                "retrieved_context_count": len(search_results),
                "sources": [
                    {"source": r.source, "text": r.text, "score": r.score}
                    for r in search_results
                ]
            }

        # 2. Synthesize specific query with Local LLM (DeepSeek-R1 / Qwen 8B)
        sys_prompt = (
            "You are the ABHI Sovereign Intelligence & Communications Cognitive Core. "
            "You have direct access to the Operator Mamu's authentic mobile communications, "
            "WhatsApp chats, State Bank of India and ICICI Bank transactions, security OTPs, emails, and call logs. "
            "Answer the user's inquiry with exact details, financial amounts, UTR numbers, dates, and clear guidance. "
            "Never invent demo data. If information is not in the context, state it clearly."
        )

        user_prompt = (
            f"Context from Real Communication Records:\n{joined_context}\n\n"
            f"Operator Question: {user_query}\n"
            f"Authoritative Answer:"
        )

        synthesis = await abhi_llm.generate(
            prompt=user_prompt,
            system=sys_prompt,
            options={"temperature": 0.25}
        )

        return {
            "query": user_query,
            "answer": synthesis.response if hasattr(synthesis, "response") else str(synthesis),
            "thinking": getattr(synthesis, "thinking", None) or getattr(synthesis, "thought", None) or "",
            "is_daily_briefing": False,
            "retrieved_context_count": len(search_results),
            "sources": [
                {"source": r.source, "text": r.text, "score": r.score}
                for r in search_results
            ]
        }

    async def start_background_sync(self, interval_seconds: int = 45) -> None:
        """Continuous background sync loop that auto-harvests mobile & email data and keeps RAG vectors fresh."""
        self._running_daemon = True
        logger.info("Universal Communications Harvester Background Daemon started.")
        while self._running_daemon:
            try:
                await self.sync_all()
            except Exception as e:
                logger.debug(f"Harvester sync loop tick error: {e}")
            await asyncio.sleep(interval_seconds)

    def stop_background_sync(self) -> None:
        self._running_daemon = False


# Authoritative Global Singleton
universal_harvester = UniversalCommunicationsHarvester()
