import json

with open('tools/recordings/benchmark_summary.json') as f:
    data = json.load(f)

print(f"{'Scenario':<35} | {'PeakAmp':<8} | {'MaxDisc':<8} | {'Severe':<7} | {'Moderate':<9} | {'Gaps(15ms)'}")
print("-" * 85)
for r in data:
    ch = r['analysis'][0]
    print(f"{r['scenario']:<35} | {ch['peak_amplitude']:<8.3f} | {ch['max_discontinuity']:<8.3f} | {ch['severe_clicks_count']:<7} | {ch['moderate_clicks_count']:<9} | {ch['silence_gap_frames_15ms']}")
