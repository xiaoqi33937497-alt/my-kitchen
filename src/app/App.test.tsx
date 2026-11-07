import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('keeps the four primary destinations visible and marks recipes as upcoming', () => {
    render(<App />, { wrapper: MemoryRouter });

    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('库存')).toBeInTheDocument();
    expect(screen.getByText('菜谱')).toBeInTheDocument();
    expect(screen.getByText('我的')).toBeInTheDocument();
    expect(screen.getByText('即将推出')).toBeInTheDocument();
  });
});
