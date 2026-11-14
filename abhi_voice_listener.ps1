# Voice Listener for ABHI Global OS Controller using Windows System.Speech
# Listens for wake words ("hey abhi", "hay abhi", "abhi") and voice queries, writes to stdout.

$ErrorActionPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Speech

try {
    $engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine
    
    # 1. Wake word grammar
    $wakeWords = New-Object System.Speech.Recognition.Choices
    [void]$wakeWords.Add(@(
        "hey abhi", "hay abhi", "abhi", "hello abhi", "ok abhi",
        "open notepad", "open terminal", "open powershell", "open calculator", "open explorer",
        "lock workstation", "lock computer", "mute volume", "what is active"
    ))
    
    $gb = New-Object System.Speech.Recognition.GrammarBuilder($wakeWords)
    $grammar = New-Object System.Speech.Recognition.Grammar($gb)
    $grammar.Name = "AbhiWakeGrammar"
    $engine.LoadGrammar($grammar)

    # 2. Dictation grammar fallback
    $dictGrammar = New-Object System.Speech.Recognition.DictationGrammar
    $dictGrammar.Name = "AbhiDictationGrammar"
    $dictGrammar.Weight = 0.5
    $engine.LoadGrammar($dictGrammar)

    $engine.SetInputToDefaultAudioDevice()

    # Audio Chime via SAPI or Windows System.Media
    function Play-Chime {
        try {
            [System.Console]::Beep(1200, 100)
            [System.Console]::Beep(1800, 150)
        } catch {}
    }

    $engine.add_SpeechRecognized({
        param($sender, $e)
        $text = $e.Result.Text
        $confidence = $e.Result.Confidence
        if ($confidence -ge 0.45 -and $text) {
            Write-Output ("VOICE_RECOGNIZED: " + $text)
            [Console]::Out.Flush()
        }
    })

    Write-Output "SPEECH_ENGINE_ACTIVE"
    [Console]::Out.Flush()

    # Continuous Recognition Loop
    $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)

    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Output ("SPEECH_ENGINE_ERROR: " + $_.Exception.Message)
    [Console]::Out.Flush()
}
