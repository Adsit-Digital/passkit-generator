import { GoogleWalletAdapter } from '../dist/GoogleWalletAdapter.js';
import { generateKeyPairSync } from 'node:crypto';

function generatePrivateKeyPem() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}

const adapter = new GoogleWalletAdapter({
  issuerId: '3388000000000000000',
  classSuffix: 'exampleEvent',
  serviceAccountEmail: 'service@example.iam.gserviceaccount.com',
  serviceAccountPrivateKey: generatePrivateKeyPem(),
  origins: ['http://localhost:3000']
});

const url = adapter.buildSaveLinkForEvent({
  id: 'ticket-123',
  eventName: 'My Concert',
  issuerName: 'My Org',
  startDate: '2025-11-01T19:00:00Z',
  venue: 'Main Arena',
  seat: { section: 'A', row: '2', seat: '14' },
  barcodeMessage: 'ABC123456',
  logoImageUrl: 'https://example.com/logo.png',
  backgroundImageUrl: 'https://example.com/bg.png'
});

console.log('Generated Save URL (test):', url);
