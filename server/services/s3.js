import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordingsDir = path.join(__dirname, '../public/recordings');

// Only skip S3 when explicit placeholder keys are present (local dev). When no
// keys are set we still enable S3 so the AWS SDK default provider chain can use
// an EC2 instance role. Explicit keys, if provided, are picked up automatically.
const hasPlaceholderCredentials =
  process.env.AWS_ACCESS_KEY_ID === 'local_aws_access_key_not_configured' ||
  process.env.AWS_SECRET_ACCESS_KEY === 'local_aws_secret_key_not_configured';

const s3Enabled = Boolean(process.env.AWS_S3_BUCKET) && !hasPlaceholderCredentials;

let client = null;
if (s3Enabled) {
  // No explicit credentials passed: the SDK resolves them from env vars,
  // the EC2 instance role (IMDS), or the rest of the default provider chain.
  client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
}

/**
 * Generate audio playback URL (S3 Presigned URL if configured, or local static file URL)
 */
export const playbackUrl = async (key, localFilePath = '') => {
  // 1. Try AWS S3 Presigned URL if credentials configured
  try {
    if (client && process.env.AWS_S3_BUCKET) {
      return await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        }),
        { expiresIn: parseInt(process.env.S3_PLAYBACK_EXPIRY_SECONDS || '300', 10) }
      );
    }
  } catch (err) {
    console.warn('⚠️ S3 presign failed:', err.message);
  }

  // 2. Check if local audio file exists in public/recordings
  const baseName = key ? key.split('/').pop() : '';
  const localFileName = localFilePath ? localFilePath.split('/').pop().split('\\').pop() : '';

  const candidates = [baseName, localFileName].filter(Boolean);
  for (const candidate of candidates) {
    const fullPath = path.join(recordingsDir, candidate);
    if (fs.existsSync(fullPath)) {
      const port = process.env.PORT || 5000;
      return `http://localhost:${port}/public/recordings/${candidate}`;
    }
  }

  // 3. If specific file not found, try to pick any available local recording fixture
  try {
    if (fs.existsSync(recordingsDir)) {
      const files = fs.readdirSync(recordingsDir).filter((f) => f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.m4a'));
      if (files.length > 0) {
        const port = process.env.PORT || 5000;
        return `http://localhost:${port}/public/recordings/${files[0]}`;
      }
    }
  } catch (e) {
    // ignore
  }

  // 4. Remote audio fallback
  return `https://actions.google.com/sounds/v1/telephones/phone_busy_signal.ogg`;
};
