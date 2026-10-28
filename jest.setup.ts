import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

process.env.SUPPRESS_JEST_WARNINGS = 'true';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'test-groq-key';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

if (typeof window !== 'undefined' && typeof window.URL.createObjectURL === 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  window.URL.revokeObjectURL = jest.fn();
}
