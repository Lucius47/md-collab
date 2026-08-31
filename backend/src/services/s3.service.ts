import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { env } from '../config/env';

// Region/endpoint/forcePathStyle are all configurable, so this same client
// works against real AWS S3 or any S3-compatible store (MinIO, R2, etc.).
export const s3 = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function putText(key: string, body: string, contentType = 'text/markdown; charset=utf-8'): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function putBinary(key: string, body: Uint8Array): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
    })
  );
}

export async function getText(key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return streamToString(res.Body as Readable);
}

export async function getBinary(key: string): Promise<Uint8Array | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    const buf = await streamToBuffer(res.Body as Readable);
    return new Uint8Array(buf);
  } catch (err: unknown) {
    if (isNoSuchKey(err)) return null;
    throw err;
  }
}

export async function getObjectStream(key: string): Promise<Readable> {
  const res = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return res.Body as Readable;
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  // S3 DeleteObjects caps out at 1000 keys per request.
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET,
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      })
    );
  }
}

export function markdownKey(nodeId: string): string {
  return `nodes/${nodeId}.md`;
}

export function yjsStateKey(nodeId: string): string {
  return `nodes/${nodeId}.yjs-state`;
}

export function versionKey(nodeId: string, versionId: string): string {
  return `versions/${nodeId}/${versionId}.md`;
}

function isNoSuchKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: string }).name === 'NoSuchKey';
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function streamToString(stream: Readable): Promise<string> {
  const buf = await streamToBuffer(stream);
  return buf.toString('utf-8');
}
