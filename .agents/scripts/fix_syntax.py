path = 'frontend/src/app/core/services/speech-voice.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '      this.speak(Language set to , .);'
replacement = "      this.speak('Language set to ' + langNames[lang] + ', ' + this.userCallsign() + '.');"

assert target in text, 'Target not found'
text = text.replace(target, replacement, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Successfully fixed line 101 in speech-voice.service.ts!')

