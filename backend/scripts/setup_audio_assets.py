"""
Download and prepare real 16kHz mono 16-bit PCM WAV samples for XSense audio evaluation.
Tries official ESC-50 (CC0 public domain) recordings from GitHub first, with realistic
multi-band acoustic waveform fallback if offline.
"""
import io
import math
import os
import urllib.request
import wave
from pathlib import Path
import numpy as np

BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = BASE_DIR / "data" / "audio_samples"
MODELS_DIR = BASE_DIR / "data" / "models"

TARGET_SR = 16000

# Official ESC-50 CC0 audio clips on GitHub
ESC50_BASE = "https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/"
ESC50_SOURCES = {
    "distress_scream_sample.wav": "1-22694-A-20.wav",   # Intense crying / vocal distress
    "heavy_rain_thunder.wav":     "1-21189-A-10.wav",   # Heavy rain pattering
    "park_laughter_chatter.wav":  "1-1791-A-26.wav",    # Human laughter
    "ambient_park_quiet.wav":     "1-56380-A-5.wav",    # Night crickets ambient
}


def write_16k_mono_wav(filepath: Path, samples_float: np.ndarray) -> None:
    """Write normalized float32 [-1.0, 1.0] array as 16kHz mono 16-bit PCM WAV."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    clipped = np.clip(samples_float, -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype(np.int16)
    with wave.open(str(filepath), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(TARGET_SR)
        wf.writeframes(pcm16.tobytes())


def decode_and_resample_wav(raw_bytes: bytes) -> np.ndarray:
    """Decode arbitrary PCM WAV bytes and resample to 16kHz mono float32."""
    with wave.open(io.BytesIO(raw_bytes), "rb") as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        n_frames = wf.getnframes()
        raw_frames = wf.readframes(n_frames)

    if sampwidth == 2:
        data = np.frombuffer(raw_frames, dtype=np.int16).astype(np.float32) / 32768.0
    elif sampwidth == 1:
        data = (np.frombuffer(raw_frames, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
    elif sampwidth == 4:
        data = np.frombuffer(raw_frames, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    if n_channels > 1:
        data = data.reshape(-1, n_channels).mean(axis=1)

    if framerate != TARGET_SR and len(data) > 0:
        duration = len(data) / float(framerate)
        target_len = int(duration * TARGET_SR)
        x_old = np.linspace(0.0, duration, num=len(data), endpoint=False)
        x_new = np.linspace(0.0, duration, num=target_len, endpoint=False)
        data = np.interp(x_new, x_old, data).astype(np.float32)

    # Trim to 3.0 seconds max for responsive playback and inference
    max_samples = TARGET_SR * 3
    if len(data) > max_samples:
        data = data[:max_samples]
    return data


def synthesize_fallback_clip(sample_id: str) -> np.ndarray:
    """Realistic multi-harmonic/filtered-noise fallback if GitHub is unreachable."""
    rng = np.random.default_rng(42)
    duration = 2.8
    t = np.linspace(0, duration, int(TARGET_SR * duration), endpoint=False)

    if "scream" in sample_id:
        # High-energy vocal formant contour with vibrato, harmonics, and breath aspiration
        f0 = 1050.0 + 380.0 * np.sin(2 * np.pi * 1.1 * t) + 25.0 * np.sin(2 * np.pi * 6.5 * t)
        phase = 2 * np.pi * np.cumsum(f0) / TARGET_SR
        glottal = (
            0.60 * np.sin(phase)
            + 0.30 * np.sin(2 * phase + 0.3)
            + 0.15 * np.sin(3 * phase + 0.7)
            + 0.08 * rng.normal(0, 1, len(t))
        )
        env = np.ones_like(t)
        env[:int(0.08 * TARGET_SR)] = np.linspace(0, 1, int(0.08 * TARGET_SR))
        env[-int(0.25 * TARGET_SR):] = np.linspace(1, 0, int(0.25 * TARGET_SR))
        sig = glottal * env
        return (sig / (np.max(np.abs(sig)) + 1e-6) * 0.88).astype(np.float32)

    elif "rain" in sample_id:
        # Pink-filtered rain noise + water droplet impulses + low-frequency thunder roll
        white = rng.normal(0, 1, len(t))
        kernel = np.exp(-np.linspace(0, 4, 64))
        kernel /= kernel.sum()
        pink = np.convolve(white, kernel, mode="same")
        thunder = 0.45 * np.sin(2 * np.pi * (48.0 - 8.0 * (t / duration)) * t) * np.exp(-0.8 * (t - 0.8) ** 2)
        droplets = (rng.random(len(t)) > 0.996).astype(np.float32) * rng.uniform(0.2, 0.5, len(t))
        sig = 0.35 * pink + thunder + droplets
        return (sig / (np.max(np.abs(sig)) + 1e-6) * 0.65).astype(np.float32)

    elif "laughter" in sample_id:
        # Burst-modulated voiced syllables ("ha-ha-ha-ha") at ~4.2 Hz syllable rate
        burst_env = np.maximum(0.0, np.sin(2 * np.pi * 4.2 * t)) ** 2 * np.exp(-0.35 * t)
        f0 = 260.0 + 45.0 * np.sin(2 * np.pi * 4.2 * t)
        phase = 2 * np.pi * np.cumsum(f0) / TARGET_SR
        voiced = 0.55 * np.sin(phase) + 0.30 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
        breath = 0.12 * rng.normal(0, 1, len(t))
        sig = (voiced + breath) * burst_env
        return (sig / (np.max(np.abs(sig)) + 1e-6) * 0.60).astype(np.float32)

    else:
        # Quiet night park with soft wind rustle and high-pitched cricket chirps
        wind = np.convolve(rng.normal(0, 0.03, len(t)), np.ones(40) / 40.0, mode="same")
        chirp_env = (np.sin(2 * np.pi * 3.0 * t) > 0.6).astype(np.float32) * (np.sin(2 * np.pi * 28.0 * t) > 0).astype(np.float32)
        crickets = 0.04 * np.sin(2 * np.pi * 4100.0 * t) * chirp_env
        sig = wind + crickets
        return np.clip(sig, -0.15, 0.15).astype(np.float32)


def setup_all() -> None:
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for local_name, esc_file in ESC50_SOURCES.items():
        out_path = SAMPLES_DIR / local_name
        url = ESC50_BASE + esc_file
        try:
            print(f"[AudioSetup] Downloading real ESC-50 sample: {esc_file} -> {local_name} ...")
            req = urllib.request.Request(url, headers={"User-Agent": "XSense-Setup/1.0"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                raw_bytes = resp.read()
            samples = decode_and_resample_wav(raw_bytes)
            # Boost vocal distress sample slightly so peak is prominent
            if "scream" in local_name:
                samples = np.clip(samples * 1.15, -0.98, 0.98)
            write_16k_mono_wav(out_path, samples)
            print(f"[AudioSetup] Saved real recording {local_name} ({len(samples)/TARGET_SR:.2f}s)")
        except Exception as exc:
            print(f"[AudioSetup] Network download skipped ({exc}); using acoustic synthesis for {local_name}")
            samples = synthesize_fallback_clip(local_name)
            write_16k_mono_wav(out_path, samples)
            print(f"[AudioSetup] Saved synthesized clip {local_name} ({len(samples)/TARGET_SR:.2f}s)")


if __name__ == "__main__":
    setup_all()
