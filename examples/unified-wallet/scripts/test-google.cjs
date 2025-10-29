const { GoogleWalletAdapter } = require('../dist/GoogleWalletAdapter.cjs');

function generateDummyKeyPair() {
  return `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDq1cR5mKpsYQ4l\n3wJ1kQ8qv9Q6v3QX4zq4S6v3Qx5nqf4uVxR+eS2D3M7p5k7v+o3d1qJgJ6k7zL1o\nYxv7C8rj5m3K1c9Nn3wQ0l2f4dGkz2gL4bYwF2q8lL3nY3z2S8b7GvKJt3Y1Jf0y\nC3tWbqk8hV4cZQ6Nq0mH4i6hQ8GmRkq8dO7nYQIDAQABAoIBAQC+dummykeyonly\nfor-local-testing-not-valid-anywhere-so-donotuse\n-----END PRIVATE KEY-----`;
}

const adapter = new GoogleWalletAdapter({
  issuerId: '3388000000000000000',
  classSuffix: 'exampleEvent',
  serviceAccountEmail: 'service@example.iam.gserviceaccount.com',
  serviceAccountPrivateKey: generateDummyKeyPair(),
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
