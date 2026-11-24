import sys
import json
import numpy as np
import scipy.io.wavfile as wav

def analyze_audio(file_path):
    # Read WAV file
    sample_rate, data = wav.read(file_path)
    
    # Normalize to float [-1.0, 1.0] if integer format
    if data.dtype == np.int16:
        samples = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        samples = data.astype(np.float32) / 2147483648.0
    elif data.dtype == np.float32 or data.dtype == np.float64:
        samples = data.astype(np.float32)
    else:
        raise ValueError(f"Unsupported dtype: {data.dtype}")
    
    # Handle stereo vs mono
    if len(samples.shape) > 1:
        # Analyze both channels separately and combined
        channels = [samples[:, ch] for ch in range(samples.shape[1])]
    else:
        channels = [samples]

    results = []
    for ch_idx, ch_data in enumerate(channels):
        duration_sec = len(ch_data) / sample_rate
        peak_amp = float(np.max(np.abs(ch_data)))
        
        # 1. Clipping Detection (|sample| >= 0.999)
        clip_threshold = 0.999
        clipped_mask = np.abs(ch_data) >= clip_threshold
        clipped_samples = int(np.sum(clipped_mask))
        clip_pct = float((clipped_samples / len(ch_data)) * 100.0)
        
        # 2. Click / Discontinuity Detection (First difference of samples)
        # In bandlimited audio, sample-to-sample difference rarely exceeds 0.25 unless there's a step discontinuity.
        diffs = np.abs(np.diff(ch_data))
        # Severe clicks: diff > 0.30
        severe_clicks = int(np.sum(diffs > 0.30))
        # Moderate clicks: diff > 0.18
        moderate_clicks = int(np.sum(diffs > 0.18))
        max_discontinuity = float(np.max(diffs)) if len(diffs) > 0 else 0.0
        
        # Find timestamps of worst clicks
        worst_click_indices = np.argsort(diffs)[-10:]
        worst_click_times = [float(idx / sample_rate) for idx in worst_click_indices if diffs[idx] > 0.18]
        worst_click_values = [float(diffs[idx]) for idx in worst_click_indices if diffs[idx] > 0.18]
        
        # 3. DC Offset Jumps
        # Moving window of 50ms
        win_size = int(sample_rate * 0.05)
        if len(ch_data) > win_size * 2:
            moving_mean = np.convolve(ch_data, np.ones(win_size)/win_size, mode='valid')
            dc_jumps = np.abs(np.diff(moving_mean[::int(win_size/2)]))
            max_dc_jump = float(np.max(dc_jumps)) if len(dc_jumps) > 0 else 0.0
            dc_offset_mean = float(np.mean(ch_data))
        else:
            max_dc_jump = 0.0
            dc_offset_mean = float(np.mean(ch_data))

        # 4. Silence Gaps during active playback (RMS < 0.001 for > 30ms)
        frame_size = int(sample_rate * 0.015) # 15ms frames
        if len(ch_data) > frame_size:
            reshaped = ch_data[:len(ch_data) - (len(ch_data) % frame_size)].reshape(-1, frame_size)
            rms_frames = np.sqrt(np.mean(reshaped**2, axis=1))
            # Gaps after initial 500ms
            skip_frames = int(0.5 / 0.015)
            if len(rms_frames) > skip_frames:
                active_frames = rms_frames[skip_frames:]
                gap_frames = np.sum(active_frames < 0.0005)
            else:
                gap_frames = 0
        else:
            gap_frames = 0

        results.append({
            "channel": ch_idx,
            "duration_sec": duration_sec,
            "sample_rate": sample_rate,
            "peak_amplitude": peak_amp,
            "clipped_samples": clipped_samples,
            "clip_percentage": clip_pct,
            "max_discontinuity": max_discontinuity,
            "severe_clicks_count": severe_clicks,
            "moderate_clicks_count": moderate_clicks,
            "worst_click_times_sec": worst_click_times,
            "worst_click_magnitudes": worst_click_values,
            "dc_offset_mean": dc_offset_mean,
            "max_dc_jump": max_dc_jump,
            "silence_gap_frames_15ms": int(gap_frames)
        })

    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_audio.py <path_to_wav>")
        sys.exit(1)
    analyze_audio(sys.argv[1])
