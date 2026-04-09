import { render, screen } from '@testing-library/react';
import { Providers } from '@/components/providers';

describe('Application Setup', () => {
  it('renders the React Query Providers without crashing', () => {
    render(
      <Providers>
        <div data-testid="test-child">Child Component</div>
      </Providers>
    );
    
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
  });
});
