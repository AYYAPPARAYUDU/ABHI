"""Unit tests for Face tracking, head pose, and hand gesture recognition."""

from app.perception.vision.face_tracker import FaceTracker, FaceLandmarksResult, HeadPose
from app.perception.vision.hand_tracker import HandTracker, HandGesture, HandLandmarksResult


def test_face_tracker_baseline():
    tracker = FaceTracker()
    res = tracker.process_frame()
    assert isinstance(res, FaceLandmarksResult)
    assert res.face_detected is True
    assert res.landmarks_count == 468
    assert res.confidence > 0.9
    assert isinstance(res.head_pose, HeadPose)


def test_hand_tracker_gesture_classification():
    tracker = HandTracker()
    # Mock landmarks for peace gesture (index & middle up, ring & pinky down)
    mock_landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]
    # Index extended
    mock_landmarks[8]["y"] = 0.2
    mock_landmarks[6]["y"] = 0.4
    # Middle extended
    mock_landmarks[12]["y"] = 0.2
    mock_landmarks[10]["y"] = 0.4
    # Ring curled
    mock_landmarks[16]["y"] = 0.6
    mock_landmarks[14]["y"] = 0.4
    # Pinky curled
    mock_landmarks[20]["y"] = 0.6
    mock_landmarks[18]["y"] = 0.4

    gesture = tracker.classify_gesture_from_landmarks(mock_landmarks)
    assert gesture == HandGesture.PEACE


def test_hand_tracker_thumbs_up():
    tracker = HandTracker()
    mock_landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]
    # Thumb extended up
    mock_landmarks[4]["y"] = 0.2
    mock_landmarks[3]["y"] = 0.4
    # All other fingers curled down
    mock_landmarks[8]["y"] = 0.6
    mock_landmarks[6]["y"] = 0.4
    mock_landmarks[12]["y"] = 0.6
    mock_landmarks[10]["y"] = 0.4
    mock_landmarks[16]["y"] = 0.6
    mock_landmarks[14]["y"] = 0.4
    mock_landmarks[20]["y"] = 0.6
    mock_landmarks[18]["y"] = 0.4

    gesture = tracker.classify_gesture_from_landmarks(mock_landmarks)
    assert gesture == HandGesture.THUMBS_UP
