"""Unit tests for Screen OCR & UI Spatial Grounding."""

from app.perception.vision.screen_ocr import ScreenOCREngine, ScreenOCRResult, DetectedUIElement


def test_screen_ocr_parsing():
    engine = ScreenOCREngine()
    result = engine.parse_screen(width=1920, height=1080)
    assert isinstance(result, ScreenOCRResult)
    assert result.image_width == 1920
    assert result.image_height == 1080
    assert len(result.detected_elements) >= 4
    assert "Save" in result.full_text


def test_find_element_grounding():
    engine = ScreenOCREngine()
    element = engine.find_element_by_text("Save")
    assert element is not None
    assert element.text == "Save"
    assert element.box.center_x > 0
    assert element.box.center_y > 0
    assert element.element_type == "button"


def test_find_element_non_existent():
    engine = ScreenOCREngine()
    element = engine.find_element_by_text("NonExistentButtonXYZ")
    assert element is None
