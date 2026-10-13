import re
import os

ts_path = r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\home\pages\home-page\home-page.component.ts"
html_path = r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\home\pages\home-page\home-page.component.html"
css_path = r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\home\pages\home-page\home-page.component.css"

with open(ts_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Extract template
tmpl_match = re.search(r"template:\s*`([\s\S]*?)`,\s*\n\s*styles:", content)
if not tmpl_match:
    raise Exception("Could not find template in home-page.component.ts")
template_raw = tmpl_match.group(1).strip()

# Remove the redundant left dock (<aside class="vision-dock-island">...</aside>)
template_cleaned = re.sub(r'<!-- 1\. Left Floating Icon Dock Capsule[\s\S]*?<\/aside>', '', template_raw)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(template_cleaned + "\n")
print("Wrote home-page.component.html")

# 2. Extract styles
styles_match = re.search(r"styles:\s*\[`([\s\S]*?)`\]", content)
if not styles_match:
    raise Exception("Could not find styles in home-page.component.ts")
styles_raw = styles_match.group(1).strip()

# Adjust .vision-glass-panel to be centered and remove margin-left: 54px
styles_cleaned = styles_raw.replace("margin-left: 54px;", "margin: 0 auto;")
styles_cleaned = styles_cleaned.replace("width: calc(100% - 100px);", "width: calc(100% - 48px);")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(styles_cleaned + "\n")
print("Wrote home-page.component.css")

# 3. Rewrite home-page.component.ts
# Replace the component decorator's template and styles with templateUrl and styleUrl
decorator_pattern = re.compile(r"(@Component\(\{[\s\S]*?selector:\s*'app-home-page',[\s\S]*?imports:\s*\[[\s\S]*?\],)([\s\S]*?)(\}\)\s*\nexport class HomePageComponent)")
m = decorator_pattern.search(content)
if not m:
    raise Exception("Could not match @Component decorator")

new_decorator = m.group(1) + "\n  templateUrl: './home-page.component.html',\n  styleUrl: './home-page.component.css'\n" + m.group(3)

new_ts = content[:m.start()] + new_decorator + content[m.end():]

with open(ts_path, "w", encoding="utf-8") as f:
    f.write(new_ts)
print("Updated home-page.component.ts to Angular CLI standards.")
