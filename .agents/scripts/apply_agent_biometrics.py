from pathlib import Path

target_file = Path("backend/app/api/v1/agent.py")
content = target_file.read_text(encoding="utf-8")

old_code = '''    return {
        "status": "synchronized",
        "thoughts": dynamic_items,
        "active_window": active_win,
        "mobile": {
            "connected": len(mobiles) > 0,
            "count": len(mobiles),
            "summary": mobile_summary,
            "devices": mobiles
        },
        "telemetry": {
            "cpu_percent": cpu,
            "ram_percent": ram,
            "timestamp": int(time.time() * 1000)
        }
    }


# Authoritative Gateway Router mirroring all agent routes under /agent-gateway'''

new_code = '''    return {
        "status": "synchronized",
        "thoughts": dynamic_items,
        "active_window": active_win,
        "mobile": {
            "connected": len(mobiles) > 0,
            "count": len(mobiles),
            "summary": mobile_summary,
            "devices": mobiles
        },
        "telemetry": {
            "cpu_percent": cpu,
            "ram_percent": ram,
            "timestamp": int(time.time() * 1000)
        }
    }


@router.get("/biometrics/presence")
async def get_operator_presence(camera_index: int = 0):
    """Optically verify if the registered operator is present at the workstation camera."""
    from backend.app.perception.vision.face_tracker import face_tracker
    res = face_tracker.detect_operator_presence(camera_index=camera_index)
    return res.model_dump()


@router.post("/biometrics/enroll")
async def enroll_operator_biometrics(name: str = "Ayyappa Rayudu Ravuvari", camera_index: int = 0):
    """Enroll operator 128-D neural face embedding from current camera view."""
    from backend.app.perception.vision.face_tracker import face_tracker
    ok, msg = face_tracker.enroll_operator(name=name, camera_index=camera_index)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"status": "SUCCESS", "message": msg, "operator_name": name}


# Authoritative Gateway Router mirroring all agent routes under /agent-gateway'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: agent.py updated with biometrics endpoints!")
else:
    print("ERROR: old_code not found in agent.py!")
