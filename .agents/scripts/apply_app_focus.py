from pathlib import Path

target_file = Path("backend/app/automation/desktop/os_control_engine.py")
content = target_file.read_text(encoding="utf-8")

old_code = '''            # Give the process a brief moment to create window
            time.sleep(0.3)

            return True, {'''

new_code = '''            # Give the process a brief moment to create window and bring to front
            time.sleep(0.35)
            self.bring_to_front_by_keyword(app_name, timeout_sec=1.5)

            return True, {'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: launch_application updated with bring_to_front!")
else:
    print("ERROR: old_code not found in content!")
