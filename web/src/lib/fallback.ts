import type { TreeNode } from '../types.js';

export const fallbackTree: TreeNode = {
  id: 'etat',
  code: 'ETAT',
  label: "État (exemple)",
  level: 'etat',
  cp: 1_000_000_000,
  ae: 1_000_000_000,
  children: [
    { id: 'M-01', code: '01', label: 'Mission A (exemple)', level: 'mission', cp: 600_000_000, ae: 600_000_000, children: [
      { id: 'P-01-001', code: '001', label: 'Programme 1', level: 'programme', cp: 600_000_000, ae: 600_000_000, children: [
        { id: 'A-01-001-01', code: '01', label: 'Action 1', level: 'action', cp: 400_000_000, ae: 400_000_000 },
        { id: 'A-01-001-02', code: '02', label: 'Action 2', level: 'action', cp: 200_000_000, ae: 200_000_000 }
      ]}
    ]},
    { id: 'M-02', code: '02', label: 'Mission B (exemple)', level: 'mission', cp: 400_000_000, ae: 400_000_000, children: [
      { id: 'P-02-002', code: '002', label: 'Programme 2', level: 'programme', cp: 400_000_000, ae: 400_000_000, children: [
        { id: 'A-02-002-01', code: '01', label: 'Action 1', level: 'action', cp: 400_000_000, ae: 400_000_000 }
      ]}
    ]}
  ],
};

