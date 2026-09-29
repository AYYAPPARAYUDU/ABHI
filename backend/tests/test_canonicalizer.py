from backend.app.perception.audio.canonicalizer import LanguageCanonicalizer, CanonicalCommand


def test_canonicalizer_telugu():
    canon = LanguageCanonicalizer()
    res = canon.canonicalize("ఈ ఫైల్ ని ఓపెన్ చేయి")
    assert res.detected_language == "te"
    assert "open" in res.canonical_intent.lower()
    assert res.confidence > 0.8


def test_canonicalizer_hindi():
    canon = LanguageCanonicalizer()
    res = canon.canonicalize("फ़ाइल खोलो")
    assert res.detected_language == "hi"
    assert "open" in res.canonical_intent.lower()


def test_canonicalizer_tamil():
    canon = LanguageCanonicalizer()
    res = canon.canonicalize("கோப்பைத் திறக்கவும்")
    assert res.detected_language == "ta"
    assert "open" in res.canonical_intent.lower()


def test_canonicalizer_english_passthrough():
    canon = LanguageCanonicalizer()
    res = canon.canonicalize("What is the current time and date?")
    assert res.detected_language == "en"
    assert res.canonical_intent == "What is the current time and date?"
