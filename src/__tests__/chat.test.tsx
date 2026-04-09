import { render, screen, fireEvent } from '@testing-library/react';
import ChatInterface from '@/components/chat/ChatInterface';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Setup query client for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('ChatInterface', () => {
  it('optimistically updates the UI when a user submits a message', async () => {
    const queryClient = createTestQueryClient();
    
    // We mock scrollIntoView since it throws in JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <ChatInterface activeProjectId={null} onProjectCreated={jest.fn()} />
      </QueryClientProvider>
    );

    // Initial state check
    expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument();

    // Type in input
    const input = screen.getByTestId('chat-input') as HTMLInputElement;
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
