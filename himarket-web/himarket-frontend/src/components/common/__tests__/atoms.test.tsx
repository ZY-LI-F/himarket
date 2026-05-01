import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  Button,
  Card,
  Empty,
  FormField,
  Modal,
  toast,
} from '../index';

afterEach(() => cleanup());

describe('common atoms', () => {
  it('renders the themed button variant class', () => {
    render(<Button variant="primary">Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' }).className).toContain(
      'hm-button--primary',
    );
  });

  it('renders card content with the atom class', () => {
    const { container } = render(<Card>Card content</Card>);

    expect(screen.getByText('Card content')).toBeInTheDocument();
    expect(container.querySelector('.hm-card')).toBeInTheDocument();
  });

  it('renders empty state action content', () => {
    render(
      <Empty
        description="No data"
        action={<Button>Retry</Button>}
      />,
    );

    expect(screen.getAllByText('No data').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders form input, password, and checkbox controls', () => {
    render(
      <>
        <FormField.Input placeholder="Name" />
        <FormField.Password placeholder="Secret" />
        <FormField.Checkbox>Agree</FormField.Checkbox>
      </>,
    );

    expect(screen.getByPlaceholderText('Name').closest('.hm-form-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Secret').closest('.hm-form-input')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Agree' })).toBeInTheDocument();
  });

  it('exports modal, select, and toast APIs', () => {
    expect(Modal.confirm).toBeTypeOf('function');
    expect(FormField.Select).toBeTypeOf('function');
    expect(toast.success).toBeTypeOf('function');
  });
});
