/**
 * Audio Recording Generator
 * Generates realistic sample audio WAV files for all employees
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordingsDir = path.join(__dirname, '../public/recordings');

if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

/**
 * Generate a valid 16-bit mono PCM WAV buffer
 */
function createWavFile(durationSeconds, frequencyPattern = [440, 880]) {
  const sampleRate = 16000; // 16kHz audio
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // 1. RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 2. fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 3. data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // 4. Synthesize voice call audio simulation
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    
    // Switch frequencies to simulate conversation back and forth
    const phase = Math.floor(t * 2) % frequencyPattern.length;
    const freq = frequencyPattern[phase];

    // Phone call cadence: ring, voice simulation modulation
    let sample = 0;
    if (t < 1.0) {
      // Dial / Ring tone
      sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 480 * t) * 0.3;
    } else {
      // Simulated conversational speech formant synthesis
      const speech1 = Math.sin(2 * Math.PI * freq * t);
      const speech2 = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.5;
      const speech3 = Math.sin(2 * Math.PI * (freq * 2.2) * t) * 0.25;
      const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t); // speech rhythm
      sample = (speech1 + speech2 + speech3) * envelope * 0.4;
    }

    // Convert to 16-bit integer (-32768 to 32767)
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

// Generate recordings for each employee
const recordingsToGenerate = [
  { name: 'call-1001-priya-nexus.wav', duration: 8, freqs: [300, 500, 420, 600] },
  { name: 'call-1002-priya-atlas.wav', duration: 6, freqs: [320, 520, 400, 580] },
  { name: 'call-1003-priya-team.wav', duration: 5, freqs: [280, 460, 380, 540] },
  { name: 'call-1004-priya-brightline.wav', duration: 9, freqs: [310, 490, 430, 620] },
  { name: 'call-1005-priya-zenith.wav', duration: 7, freqs: [330, 510, 410, 590] },
  { name: 'call-1006-priya-vertex.wav', duration: 6, freqs: [300, 480, 390, 560] },
  { name: 'call-1007-arjun-acuity.wav', duration: 8, freqs: [220, 380, 260, 420] },
  { name: 'call-1008-arjun-cloudscale.wav', duration: 10, freqs: [240, 400, 280, 440] },
  { name: 'call-1009-arjun-team.wav', duration: 5, freqs: [210, 360, 250, 410] },
  { name: 'call-1010-arjun-horizon.wav', duration: 9, freqs: [230, 390, 270, 430] },
  { name: 'call-1011-arjun-quantum.wav', duration: 7, freqs: [250, 410, 290, 450] },
  { name: 'call-1012-kavya-finpulse.wav', duration: 9, freqs: [350, 550, 450, 650] },
  { name: 'call-1013-kavya-nexus.wav', duration: 6, freqs: [340, 530, 440, 620] },
  { name: 'call-1014-kavya-team.wav', duration: 4, freqs: [330, 510, 420, 600] },
  { name: 'call-1015-kavya-atlas.wav', duration: 8, freqs: [360, 560, 460, 640] },
  { name: 'call-1016-kavya-brightline.wav', duration: 7, freqs: [350, 540, 430, 610] },
  { name: 'call-1017-rohan-zenith.wav', duration: 8, freqs: [260, 440, 320, 480] },
  { name: 'call-1018-rohan-vertex.wav', duration: 6, freqs: [270, 450, 310, 490] },
  { name: 'call-1019-sneha-acuity.wav', duration: 9, freqs: [320, 520, 420, 600] },
  { name: 'call-1020-sneha-cloudscale.wav', duration: 7, freqs: [310, 500, 410, 590] },
  { name: 'call-1021-sneha-quantum.wav', duration: 8, freqs: [330, 530, 430, 610] },
];

console.log('🎙️ Generating sample audio recordings in public/recordings/ ...');
recordingsToGenerate.forEach((rec) => {
  const filePath = path.join(recordingsDir, rec.name);
  const buffer = createWavFile(rec.duration, rec.freqs);
  fs.writeFileSync(filePath, buffer);
  console.log(`   ✅ Generated ${rec.name} (${rec.duration}s, ${(buffer.length / 1024).toFixed(1)} KB)`);
});

console.log('🎉 Audio recordings generated successfully!');
