import { generateKeyPairSync, randomBytes, sign } from 'node:crypto';

export interface SelfSigned {
  readonly certificatePem: string;
  readonly keyPem: string;
}

const day = 86_400_000;

function length(size: number): Buffer {
  if (size < 0x80) {
    return Buffer.from([size]);
  }
  const bytes = Buffer.from(size.toString(16).padStart(size > 0xff ? 4 : 2, '0'), 'hex');
  return Buffer.concat([Buffer.from([0x80 | bytes.length]), bytes]);
}

function element(tag: number, ...content: Buffer[]): Buffer {
  const body = Buffer.concat(content);
  return Buffer.concat([Buffer.from([tag]), length(body.length), body]);
}

const sequence = (...content: Buffer[]) => element(0x30, ...content);
const objectId = (hex: string) => element(0x06, Buffer.from(hex, 'hex'));
const ecdsaWithSha256 = sequence(objectId('2a8648ce3d040302'));

function time(at: Date): Buffer {
  const text = at.toISOString().replace(/[-:T]/g, '').slice(2, 14);
  return element(0x17, Buffer.from(`${text}Z`, 'ascii'));
}

function commonName(name: string): Buffer {
  return sequence(element(0x31, sequence(objectId('550403'), element(0x0c, Buffer.from(name)))));
}

function pem(label: string, der: Buffer): string {
  const lines = der.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

export function selfSigned(hostname: string, now = new Date()): SelfSigned {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const serial = randomBytes(8);
  serial[0] = (serial[0] & 0x3f) | 0x40;
  const name = commonName(hostname);
  const alternativeNames = sequence(element(0x82, Buffer.from(hostname)));
  const extensions = element(
    0xa3,
    sequence(sequence(objectId('551d11'), element(0x04, alternativeNames))),
  );
  const certificate = sequence(
    element(0xa0, element(0x02, Buffer.from([2]))),
    element(0x02, serial),
    ecdsaWithSha256,
    name,
    sequence(time(new Date(now.getTime() - day)), time(new Date(now.getTime() + 365 * day))),
    name,
    publicKey.export({ type: 'spki', format: 'der' }),
    extensions,
  );
  const signature = sign('sha256', certificate, privateKey);
  const signed = sequence(certificate, ecdsaWithSha256, element(0x03, Buffer.from([0]), signature));
  return {
    certificatePem: pem('CERTIFICATE', signed),
    keyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}
