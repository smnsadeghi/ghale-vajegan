import fs from 'node:fs';

export function audioBufferToWav(channelDataArray, sampleRate) {
  const numChannels = channelDataArray.length;
  const numSamples = channelDataArray[0].length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34); // BitsPerSample

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write interleaved 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelDataArray[ch][i];
      // Clamp to [-1.0, 1.0]
      sample = Math.max(-1.0, Math.min(1.0, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      buffer.writeInt16LE(Math.round(intSample), offset);
      offset += 2;
    }
  }

  return buffer;
}
