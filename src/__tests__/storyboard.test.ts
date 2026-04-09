/** @jest-environment node */
import { POST } from '@/app/api/chat/route';
import { Project } from '@/models/Project';
import { ai } from '@/lib/ai';

// Mock dependencies
jest.mock('@/lib/db', () => jest.fn());
jest.mock('@/lib/ai', () => ({
  ai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));
jest.mock('@/models/Project');

describe('Storyboard JSON parse resilience', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console.error so our intentional bad JSON parse doesn't pollute the test output
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('handles invalid JSON from AI without crashing', async () => {
    const mockSave = jest.fn();
    const mockProject = {
      _id: 'proj123',
      chatHistory: [] as any[],
      visualMetadata: {},
      save: mockSave,
    };
    
    (Project.findById as jest.Mock).mockResolvedValue(mockProject);
    
    // AI returns intentionally broken JSON
    (ai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: '```json\n[{"scene_number": 1, trailing comma broken"}]```' } }],
    });

    const req = {
      json: async () => ({ projectId: 'proj123', content: 'Generate storyboard' }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(200); // Server shouldn't crash, returns 200 properly

    const json = await res.json();
    expect(json.message.content).toContain('an error occurred during formatting');
    
    // Check that save was still called so user gets the error logically
    expect(mockSave).toHaveBeenCalled();
  });
});
