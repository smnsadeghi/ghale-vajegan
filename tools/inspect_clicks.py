import json
import numpy as np
import scipy.io.wavfile as wav

def inspect_clicks(wav_file, num_clicks=5):
    sr, data = wav.read(wav_file)
    if data.dtype == np.int16:
        data = data.astype(np.float32) / 32768.0
    if len(data.shape) > 1:
        data = data[:, 0]
    
    diffs = np.abs(np.diff(data))
    top_indices = np.argsort(diffs)[-num_clicks:]
    print(f"\n--- Top Clicks in {wav_file} ---")
    for idx in reversed(top_indices):
        t = idx / sr
        disc = diffs[idx]
        sample_before = data[idx]
        sample_after = data[idx+1]
        print(f"Time: {t:.4f}s | Jump: {disc:.4f} (from {sample_before:.4f} to {sample_after:.4f})")
        # Print 5 samples around the click
        start = max(0, idx - 2)
        end = min(len(data), idx + 4)
        print("   Samples:", np.round(data[start:end], 4))

inspect_clicks('tools/recordings/track_battle-inferno_normal.wav')
inspect_clicks('tools/recordings/sfx_bursts_over_music.wav')
inspect_clicks('tools/recordings/heavy_ui_swiping_throttle_4x.wav')
