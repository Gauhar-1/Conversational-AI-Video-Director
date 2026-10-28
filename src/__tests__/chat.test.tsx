import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInterface from '@/components/chat/ChatInterface';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('ChatInterface', () => {
  beforeEach(() => {
    window.alert = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
    global.fetch = jest.fn().mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({
                projectId: 'proj-123',
                message: { role: 'assistant', content: 'Story initialized.' },
              }),
            } as any),
          500
        )
      )
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('optimistically updates the UI when a user submits a message', async () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ChatInterface activeProjectId={null} onProjectCreated={jest.fn()} />
      </QueryClientProvider>
    );

    // Initial state check
    expect(screen.getByText(/Writer's Room/i)).toBeInTheDocument();

    // Type in input
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Make a cyberpunk city scene' } });
    expect(input.value).toBe('Make a cyberpunk city scene');

    // Submit form
    const submitBtn = screen.getByTestId('chat-submit');
    fireEvent.click(submitBtn);

    // Verify optimistic update appears immediately without awaiting async network response
    const optimisticMessage = await screen.findByText('Make a cyberpunk city scene');
    expect(optimisticMessage).toBeInTheDocument();

    // Verify input is cleared
    expect(input.value).toBe('');
  });
});
