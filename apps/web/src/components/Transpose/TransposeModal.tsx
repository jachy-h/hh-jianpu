import React, { useState, useMemo, useEffect } from 'react';
import {
  parse,
  transposeScore,
  scoreToSource,
  calculateSemitoneDistance,
  calculateFingeringSemitones,
  type Score,
  type KeyName,
  type FluteFingering,
  FLUTE_FINGERING_LOWEST_NOTE,
  KEY_SEMITONE_OFFSET,
} from '@hh-jianpu/core';

interface TransposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: string;
  onApply: (newSource: string, titleSuffix?: string) => void;
}

const KEY_OPTIONS: KeyName[] = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

const FINGERING_OPTIONS: { value: FluteFingering; label: string }[] = [
  { value: '5', label: '筒音作5' },
  { value: '2', label: '筒音作2' },
  { value: '1', label: '筒音作1' },
  { value: '6', label: '筒音作6' },
];

function noteToMidi(pitch: number, octave: number): number {
  const pitchOffset: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };
  const octaveOffset = octave * 12;
  return 60 + (pitchOffset[pitch] ?? 0) + octaveOffset;
}

function findLowestNote(score: Score): { pitch: number; octave: number } | null {
  let lowest: { pitch: number; octave: number; midi: number } | null = null;

  for (const measure of score.measures) {
    for (const note of measure.notes) {
      if (note.type === 'note') {
        const midi = noteToMidi(note.pitch, note.octave);
        if (!lowest || midi < lowest.midi) {
          lowest = { pitch: note.pitch, octave: note.octave, midi };
        }
      }
    }
  }

  return lowest ? { pitch: lowest.pitch, octave: lowest.octave } : null;
}

function formatPitch(pitch: number, octave: number): string {
  const octaveStr = octave > 0 ? "'".repeat(octave) : octave < 0 ? ','.repeat(-octave) : '';
  return `${pitch}${octaveStr}`;
}

const TransposeModal: React.FC<TransposeModalProps> = ({ isOpen, onClose, source, onApply }) => {
  const [selectedKey, setSelectedKey] = useState<KeyName>('C');
  const [selectedFingering, setSelectedFingering] = useState<FluteFingering>('5');
  const [mode, setMode] = useState<'key' | 'fingering'>('fingering');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const currentScore = useMemo(() => parse(source).score, [source]);
  const currentKey = currentScore?.metadata.key ?? 'C';
  const lowestNote = useMemo(() => (currentScore ? findLowestNote(currentScore) : null), [currentScore]);

  const fingeringSemitones = useMemo(() => {
    if (!lowestNote) return 0;
    const currentMidi = noteToMidi(lowestNote.pitch, lowestNote.octave);
    const target = FLUTE_FINGERING_LOWEST_NOTE[selectedFingering];
    const targetMidi = noteToMidi(target.pitch, target.octave);
    return currentMidi >= targetMidi ? 0 : targetMidi - currentMidi;
  }, [lowestNote, selectedFingering]);

  const keySemitones = useMemo(() => {
    const from = KEY_SEMITONE_OFFSET[currentKey];
    const to = KEY_SEMITONE_OFFSET[selectedKey];
    return to - from;
  }, [currentKey, selectedKey]);

  const currentSemitones = mode === 'key' ? keySemitones : fingeringSemitones;

  const handleApply = () => {
    if (!currentScore) return;
    const transposedScore = transposeScore(currentScore, currentSemitones);
    const newSource = scoreToSource(transposedScore);
    onApply(newSource, '移调版');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">移调设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">📝 当前谱面信息</div>
            <div className="text-sm text-gray-600">
              <div>调号：{currentKey}</div>
              <div>最低音：{lowestNote ? formatPitch(lowestNote.pitch, lowestNote.octave) : '未知'}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-3">🎯 目标设置</div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-2">目标调号（手动选择）</div>
              <div className="flex flex-wrap gap-2">
                {KEY_OPTIONS.map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedKey(key);
                      setMode('key');
                    }}
                    className={`px-3 py-1.5 rounded text-sm ${
                      mode === 'key' && selectedKey === key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {mode === 'key' && keySemitones !== 0 && (
                <div className="mt-2 text-sm text-blue-600">
                  {keySemitones > 0 ? `升高 ${keySemitones} 半音` : `降低 ${-keySemitones} 半音`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-400">或者</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">适配笛子指法</div>
              <div className="grid grid-cols-2 gap-2">
                {FINGERING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedFingering(opt.value);
                      setMode('fingering');
                    }}
                    className={`px-4 py-2 rounded text-left flex items-center justify-between ${
                      mode === 'fingering' && selectedFingering === opt.value
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <span>🪈 {opt.label}</span>
                    {mode === 'fingering' && selectedFingering === opt.value && fingeringSemitones > 0 && (
                      <span className="text-sm text-blue-600">需上升 {fingeringSemitones} 半音</span>
                    )}
                    {mode === 'fingering' && selectedFingering === opt.value && fingeringSemitones === 0 && lowestNote && (
                      <span className="text-sm text-green-600">✓ 无需移调</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-sm text-amber-800">
              ⚠️ 此操作将生成新的简谱源码，不会修改原谱。
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            取消
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={currentSemitones === 0}
          >
            确认移调
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransposeModal;
