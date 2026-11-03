import sys
from pathlib import Path

target_file = Path("backend/app/automation/desktop/os_control_engine.py")
content = target_file.read_text(encoding="utf-8")

old_code = '''    def open_url(self, url: str, browser: str = "default") -> Tuple[bool, Optional[str]]:
        """Open any URL in specified browser or system default."""
        target_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
        b = browser.lower().strip()
        try:
            # 1. If explicit browser requested, try direct executable launch without shell quoting issues
            if b in ("chrome", "edge", "firefox", "brave"):
                found = find_browser_executable(b)
                if found:
                    clean_exe = found.strip('"\\'')
                    try:
                        subprocess.Popen([clean_exe, target_url])
                        return True, None
                    except Exception:
                        pass

            # 2. Windows native URL activation (opens target in user's default browser reliably)
            if self.is_windows:
                try:
                    os.startfile(target_url)
                    return True, None
                except Exception:
                    try:
                        subprocess.Popen(["powershell", "-NoProfile", "-Command", f"Start-Process '{target_url}'"])
                        return True, None
                    except Exception:
                        subprocess.Popen(f'start "" "{target_url}"', shell=True)
                        return True, None
            else:
                subprocess.Popen(["xdg-open", target_url])
                return True, None
        except Exception as e:
            return False, f"Failed to open URL '{url}': {str(e)}"'''

new_code = '''    def bring_to_front_by_keyword(self, keyword: str, timeout_sec: float = 2.0) -> bool:
        """Poll briefly for a window matching keyword and bring it directly to foreground."""
        if not self.is_windows or not self._user32:
            return False
        start = time.time()
        kw_lower = keyword.lower()
        while time.time() - start < timeout_sec:
            windows = self.list_windows()
            for w in windows:
                title = w.get("title", "").lower()
                if kw_lower in title and w.get("visible", False):
                    hwnd = w.get("hwnd")
                    if hwnd:
                        ok, _ = self.focus_window(hwnd)
                        if ok:
                            return True
            time.sleep(0.2)
        return False

    def open_url(self, url: str, browser: str = "default") -> Tuple[bool, Optional[str]]:
        """Open any URL in specified browser or system default, ensuring foreground focus."""
        target_url = url if url.startswith(("http://", "https://")) else f"https://{url}"
        b = browser.lower().strip()
        try:
            # 1. If explicit browser requested, try direct executable launch without shell quoting issues
            if b in ("chrome", "edge", "firefox", "brave"):
                found = find_browser_executable(b)
                if found:
                    clean_exe = found.strip('"\\'')
                    try:
                        subprocess.Popen([clean_exe, target_url])
                        time.sleep(0.35)
                        self.bring_to_front_by_keyword(b, timeout_sec=1.5)
                        return True, None
                    except Exception:
                        pass

            # 2. Windows native URL activation (opens target in user's default browser reliably)
            if self.is_windows:
                try:
                    os.startfile(target_url)
                except Exception:
                    try:
                        subprocess.Popen(["powershell", "-NoProfile", "-Command", f"Start-Process '{target_url}'"])
                    except Exception:
                        subprocess.Popen(f'start "" "{target_url}"', shell=True)
                
                # Bring browser or target tab to front
                time.sleep(0.35)
                for kw in ["chrome", "edge", "youtube", "gmail", "whatsapp", "browser"]:
                    if self.bring_to_front_by_keyword(kw, timeout_sec=0.4):
                        break
                return True, None
            else:
                subprocess.Popen(["xdg-open", target_url])
                return True, None
        except Exception as e:
            return False, f"Failed to open URL '{url}': {str(e)}"'''

# Normalize newlines
old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: open_url updated with foreground activation!")
else:
    print("ERROR: old_code not found in content!")
