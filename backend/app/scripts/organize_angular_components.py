import re
import os

components = [
    {
        "name": "business-page",
        "dir": r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\business\pages\business-page",
        "ts": "business-page.component.ts",
        "html": "business-page.component.html",
        "css": "business-page.component.css",
        "selector": "app-business-page",
        "class_name": "BusinessPageComponent"
    },
    {
        "name": "decision-pipeline-page",
        "dir": r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\decision-pipeline\pages\decision-pipeline-page",
        "ts": "decision-pipeline-page.component.ts",
        "html": "decision-pipeline-page.component.html",
        "css": "decision-pipeline-page.component.css",
        "selector": "app-decision-pipeline-page",
        "class_name": "DecisionPipelinePageComponent"
    },
    {
        "name": "network-page",
        "dir": r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\network\pages\network-page",
        "ts": "network-page.component.ts",
        "html": "network-page.component.html",
        "css": "network-page.component.css",
        "selector": "app-network-page",
        "class_name": "NetworkPageComponent"
    },
    {
        "name": "intelligence-page",
        "dir": r"C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI\frontend\src\app\features\intelligence\pages\intelligence-page",
        "ts": "intelligence-page.component.ts",
        "html": "intelligence-page.component.html",
        "css": "intelligence-page.component.css",
        "selector": "app-intelligence-page",
        "class_name": "IntelligencePageComponent"
    }
]

for comp in components:
    ts_file = os.path.join(comp["dir"], comp["ts"])
    html_file = os.path.join(comp["dir"], comp["html"])
    css_file = os.path.join(comp["dir"], comp["css"])

    if not os.path.exists(ts_file):
        print(f"Skipping {comp['name']}: TS file not found")
        continue

    with open(ts_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if already using templateUrl
    if "templateUrl:" in content:
        print(f"{comp['name']} already uses templateUrl")
        continue

    # Extract template
    tmpl_match = re.search(r"template:\s*`([\s\S]*?)`,\s*\n\s*styles:", content)
    if not tmpl_match:
        print(f"Failed to find template in {comp['name']}")
        continue
    template_raw = tmpl_match.group(1).strip()

    # Extract styles
    styles_match = re.search(r"styles:\s*\[`([\s\S]*?)`\]", content)
    if not styles_match:
        print(f"Failed to find styles in {comp['name']}")
        continue
    styles_raw = styles_match.group(1).strip()

    # Write HTML file
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(template_raw + "\n")
    print(f"Wrote {comp['html']}")

    # Write CSS file
    with open(css_file, "w", encoding="utf-8") as f:
        f.write(styles_raw + "\n")
    print(f"Wrote {comp['css']}")

    # Rewrite TS file with templateUrl and styleUrl
    decorator_pattern = re.compile(
        rf"(@Component\(\{{[\s\S]*?selector:\s*'{comp['selector']}',[\s\S]*?imports:\s*\[[\s\S]*?\],)([\s\S]*?)(\}}\)\s*\nexport class {comp['class_name']})"
    )
    m = decorator_pattern.search(content)
    if not m:
        print(f"Failed to match decorator in {comp['name']}")
        continue

    new_decorator = m.group(1) + f"\n  templateUrl: './{comp['html']}',\n  styleUrl: './{comp['css']}'\n" + m.group(3)
    new_ts = content[:m.start()] + new_decorator + content[m.end():]

    with open(ts_file, "w", encoding="utf-8") as f:
        f.write(new_ts)
    print(f"Refactored {comp['ts']} to standard Angular CLI structure.")
