/**
 * Client-side waveform peak extraction from audio files.
 * Uses Web Audio API to decode audio and extract amplitude peaks.
 */

/**
 * Extract normalized peak values from an AudioBuffer.
 * @param audioBuffer Decoded audio buffer
 * @param numBars Number of peak values to generate (default 200)
 * @returns Array of normalized float values (0-1)
 */
export function generateWaveformPeaks(audioBuffer: AudioBuffer, numBars: number = 200): number[] {
  const rawData = audioBuffer.getChannelData(0); // Use first channel
  const samples = rawData.length;
  const blockSize = Math.floor(samples / numBars);
  const peaks: number[] = [];

  for (let i = 0; i < numBars; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples);

    for (let j = start; j < end; j++) {
      const abs = Math.abs(rawData[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }

  // Normalize to 0-1 range
  const maxPeak = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / maxPeak);
}

/**
 * Generate waveform peaks from an audio File object.
 * @param file The audio file (MP3, WAV, etc.)
 * @param numBars Number of peak values (default 200)
 * @returns Promise resolving to array of normalized peaks and duration in seconds
 */
export async function generateWaveformFromFile(
  file: File,
  numBars: number = 200,
): Promise<{ peaks: number[]; duration: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const peaks = generateWaveformPeaks(audioBuffer, numBars);
    return { peaks, duration: Math.round(audioBuffer.duration) };
  } finally {
    await audioContext.close();
  }
}

/**
 * Format seconds to MM:SS display string
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
