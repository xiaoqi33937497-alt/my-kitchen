import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsView } from './SettingsPage';

describe('SettingsView', () => {
  it('offers backup export and restore', () => {
    render(<SettingsView onExport={() => undefined} onImport={() => undefined} />);
    expect(screen.getByRole('button', { name: '导出备份' })).toBeInTheDocument();
    expect(screen.getByText('从备份恢复')).toBeInTheDocument();
  });
});
