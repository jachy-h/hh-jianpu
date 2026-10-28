#!/usr/bin/env python3
"""从保留的 Salamander MP3 制作教学钢琴持续采样；只依赖 Python 标准库与 ffmpeg。"""
import array
import json
import math
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'apps/web/public/audio/piano'
DESTINATION = SOURCE / 'sustain'
MANIFEST = ROOT / 'apps/web/src/services/piano-samples.json'
RATE = 44100
CHANNELS = 2
TARGET_RMS = 0.22


def prepare(path):
    note = path.stem.replace('Ds', 'D#').replace('Fs', 'F#')
    degree = {'C': 0, 'D#': 3, 'F#': 6, 'A': 9}[note[:-1]]
    midi = (int(note[-1]) + 1) * 12 + degree
    frequency = 440 * 2 ** ((midi - 69) / 12)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-t', '1',
                          '-f', 'f32le', '-ac', str(CHANNELS), '-ar', str(RATE), '-'],
                         check=True, capture_output=True).stdout
    samples = array.array('f', raw)
    # 高音尾音衰减更快，从较早的稳定段取环；环长约 0.24 秒且对齐整周期。
    start = round((0.14 if midi >= 84 else 0.3) * RATE)
    period = RATE / frequency
    length = round(max(4, round(0.24 * frequency)) * period)
    end = start + length
    if len(samples) < end * CHANNELS:
        raise ValueError(f'{note}: 采样过短')
    samples = samples[:end * CHANNELS]
    # 用约 40ms 的平滑幅度包络校准各音区；保留起音，不把录音尾噪放大为持续音。
    window = max(1024, round(3 * period))
    squared = [sum(samples[i * 2 + c] ** 2 for c in range(2)) / 2 for i in range(end)]
    cumulative = [0.0]
    for value in squared:
        cumulative.append(cumulative[-1] + value)
    reference = math.sqrt(sum(squared[round(0.02 * RATE):round(0.12 * RATE)]) / round(0.1 * RATE))
    gains = []
    previous_gain = min(80, TARGET_RMS / max(reference, 1e-5))
    for i in range(end):
        lo, hi = max(0, i - window // 2), min(end, i + window // 2)
        rms = math.sqrt(max((cumulative[hi] - cumulative[lo]) / max(1, hi - lo), 1e-10))
        target = TARGET_RMS * (1 + 0.15 * math.exp(-i / RATE / 0.08))
        gain = min(80, target / rms)
        previous_gain += (gain - previous_gain) * 0.001
        gains.append(previous_gain)
    for i in range(end):
        for c in range(CHANNELS):
            samples[i * 2 + c] *= gains[i]
    # 环末尾交叉淡入环起点之前的波形，确保 wrap 两侧数值/斜率连续。
    fade = min(length // 3, max(round(0.025 * RATE), round(2 * period)))
    for j in range(fade):
        weight = (j + 1) / fade
        for c in range(CHANNELS):
            tail = (end - fade + j) * 2 + c
            head = (start - fade + j) * 2 + c
            samples[tail] = samples[tail] * (1 - weight) + samples[head] * weight
    # 只压住瞬态峰值，不用整段峰值把持续段再次压低。
    for _ in range(3):
        loop_rms = math.sqrt(sum(value ** 2 for value in samples[start * 2:end * 2]) / (length * 2))
        correction = TARGET_RMS / loop_rms
        for index, value in enumerate(samples):
            value *= correction
            magnitude = abs(value)
            samples[index] = value if magnitude <= 0.7 else math.copysign(0.7 + 0.22 * math.tanh((magnitude - 0.7) / 0.22), value)
    loop_rms = math.sqrt(sum(value ** 2 for value in samples[start * 2:end * 2]) / (length * 2))
    peak = max(abs(value) for value in samples)
    pcm = array.array('h', [round(value * 32767) for value in samples])
    output = DESTINATION / f'{path.stem}.wav'
    with wave.open(str(output), 'wb') as stream:
        stream.setnchannels(CHANNELS)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(pcm.tobytes())
    seam = max(abs(pcm[end * 2 - 2 + c] - pcm[start * 2 + c]) / 32767 for c in range(2))
    return note, {'url': f'sustain/{path.stem}.wav', 'loopStart': start / RATE,
                  'loopEnd': end / RATE}, {'note': note, 'loopRms': round(loop_rms, 5),
                                          'peak': round(peak, 5),
                                          'seamStep': round(seam, 5)}


if __name__ == '__main__':
    DESTINATION.mkdir(parents=True, exist_ok=True)
    manifest, report = {}, []
    for path in sorted(SOURCE.glob('*.mp3')):
        note, definition, measurement = prepare(path)
        manifest[note] = definition
        report.append(measurement)
    if len(manifest) != 30:
        raise ValueError(f'需要 30 个原始采样，实际 {len(manifest)}')
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (DESTINATION / 'measurements.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
