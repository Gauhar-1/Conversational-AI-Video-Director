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

describe('API POST /api/chat', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fails if projectId is not provided', async () => {
    const req = {
      json: async () => ({ content: 'Hello' }),
    } as any;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing projectId');
  });

  it('processes text properly and interacts with Project DB', async () => {
    const mockSave = jest.fn();
    const mockProject = {
      _id: 'proj123',
      chatHistory: [] as any[],
      visualMetadata: {},
      save: mockSave,
    };
    
    (Project.findById as jest.Mock).mockResolvedValue(mockProject);
    (ai.chat.completions.create as jest.Mock).mockResolvedValue({
      choices: [{ message: { content: 'This is Nemotron responding' } }],
    });

    const req = {
      json: async () => ({ projectId: 'proj123', content: 'What is this?' }),
    } as any;

    const res = await POST(req);
    
    expect(Project.findById).toHaveBeenCalledWith('proj123');
    expect(ai.chat.completions.create).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
    
    const json = await res.json();
    expect(json.message.content).toBe('This is Nemotron responding');
    expect(mockProject.chatHistory[1].content).toBe('This is Nemotron responding'); // Index 0 is user, index 1 is assistant
  });
});
