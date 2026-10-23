/** Export a reproducible board snapshot from the current Zustand cellStore.
 * Import this module from your web app, then call downloadSudokuFixture().
 */
import { cellStore } from '@sudoku/common/store/store';

export function captureSudokuFixture(name = 'board-state') {
  const cells = cellStore.getState().cells;
  if (!Array.isArray(cells) || cells.length !== 81) {
    throw new Error('Expected exactly 81 cells in square-major order');
  }
  const values = cells.map((cell, i) => {
    const v = Number(cell.value);
    if (!Number.isInteger(v) || v < 0 || v > 9) throw new Error(`Invalid value at ${i}`);
    return v;
  });
  const candidates = cells.map((cell, i) => {
    if (values[i] !== 0) return [];
    if (!Array.isArray(cell.activecandidates)) throw new Error(`Missing activecandidates at ${i}`);
    const digits = [...new Set(cell.activecandidates.map(Number))].sort((a, b) => a - b);
    if (digits.some(d => !Number.isInteger(d) || d < 1 || d > 9)) {
      throw new Error(`Invalid candidates at ${i}`);
    }
    return digits;
  });
  return { schema: 'sudoku-board-v1', name, indexing: 'square-major', values, candidates };
}

export function downloadSudokuFixture(name = 'board-state') {
  const fixture = captureSudokuFixture(name);
  const json = JSON.stringify(fixture, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fixture;
}
