"""Unit tests for structured logging and secret redaction."""

from backend.app.core.logging import redact_sensitive_text


def test_redact_sensitive_text():
    # Test API key redaction
    sample_text = 'User provided api_key="sk-live-1234567890abcdef" in request'
    redacted = redact_sensitive_text(sample_text)
    assert "sk-live-1234567890abcdef" not in redacted
    assert "***REDACTED***" in redacted

    # Test Bearer token redaction
    bearer_text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    redacted_bearer = redact_sensitive_text(bearer_text)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in redacted_bearer
    assert "***REDACTED***" in redacted_bearer
