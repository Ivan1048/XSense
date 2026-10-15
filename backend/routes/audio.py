"""
Audio Inference & Benchmark WAV Routes for XSense.
"""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

try:
    from services.audio_inference import (
        analyze_live_wav_bytes,
        analyze_sample_file,
        get_sample_path,
        list_available_samples,
    )
except ImportError:
    from backend.services.audio_inference import (
        analyze_live_wav_bytes,
        analyze_sample_file,
        get_sample_path,
        list_available_samples,
    )

router = APIRouter()


class AnalyzeSamplePayload(BaseModel):
    sample_id: str
    device_id: str = "AUD-001"
    zone_id: str = "north_entrance"
    pole_id: Optional[str] = "AS-101"


@router.get("/samples")
def get_audio_samples():
    """Return list of available benchmark .wav clips."""
    return {"samples": list_available_samples()}


@router.get("/files/{sample_id}")
def stream_audio_file(sample_id: str):
    """Serve the actual 16kHz mono .wav file for browser HTML5 <audio> playback."""
    try:
        fpath = get_sample_path(sample_id)
        return FileResponse(
            path=str(fpath),
            media_type="audio/wav",
            filename=fpath.name,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/analyze-sample")
def analyze_recorded_sample(payload: AnalyzeSamplePayload):
    """Run YAMNet waveform analysis on a recorded .wav sample."""
    try:
        inference = analyze_sample_file(payload.sample_id)
        return {
            "ok": True,
            "device_id": payload.device_id,
            "zone_id": payload.zone_id,
            "pole_id": payload.pole_id,
            "inference": inference,
        }
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/analyze-live")
async def analyze_live_microphone(
    audio_file: UploadFile = File(...),
    device_id: str = Form("MIC-LIVE"),
    zone_id: str = Form("north_entrance"),
    pole_id: str = Form("AS-101"),
):
    """Analyze a 3-second 16kHz mono PCM WAV uploaded from the browser microphone."""
    raw_bytes = await audio_file.read()
    inference = analyze_live_wav_bytes(raw_bytes)
    return {
        "ok": True,
        "device_id": device_id,
        "zone_id": zone_id,
        "pole_id": pole_id,
        "inference": inference,
    }