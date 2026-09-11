import {mkdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const recordingsDirectory = fileURLToPath(new URL('../public/recordings/', import.meta.url));

function createWav({frequency, durationSeconds = 2, sampleRate = 8_000}) {
  const samples = Math.floor(sampleRate * durationSeconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < samples; index += 1) {
    const fade = Math.min(1, index / 400, (samples - index) / 400);
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 5_000 * fade), 44 + index * 2);
  }
  return buffer;
}

const fixtures = [['call-1042-priya-sharma.wav', 440], ['call-1041-arjun-mehta.wav', 523.25], ['call-1038-priya-sharma.wav', 659.25]];

export async function createSampleRecordings() {
  await mkdir(recordingsDirectory, {recursive: true});
  return Promise.all(fixtures.map(async ([fileName, frequency]) => {
    const destination = path.join(recordingsDirectory, fileName);
    await writeFile(destination, createWav({frequency}));
    return {fileName, fileSize: (await stat(destination)).size};
  }));
}
