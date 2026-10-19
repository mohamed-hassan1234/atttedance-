// Design-proposal only. Not imported by any production screen.
export const CONCEPTS = {
  A: {
    id: 'A',
    name: 'Premium University Enterprise',
    short: 'Premium Enterprise',
    shell: 'light-sidebar',
    blurb: 'Calm white surfaces, a light sidebar and restrained green accents. Institutional, precise, easy to read for long sessions.',
    traits: ['Light sidebar, white cards', 'Green accent only for actions and status', 'Generous spacing, soft hairline borders', 'Best for: admin back-office use'],
  },
  B: {
    id: 'B',
    name: 'Modern Academic Technology',
    short: 'Academic Technology',
    shell: 'dark-sidebar',
    blurb: 'Dark navy sidebar, green and blue paired together, a live-exam hero and an activity rail. Contemporary and scanner-friendly.',
    traits: ['Navy sidebar with green active marker', 'Blue used for data, green for decisions', 'Live exam hero + right activity rail', 'Best for: mixed admin and invigilator teams'],
  },
  C: {
    id: 'C',
    name: 'Executive Examination Control Center',
    short: 'Control Center',
    shell: 'top-nav',
    blurb: 'Top navigation, a persistent exam-in-progress strip and dense tables. Maximum information per screen for exam officers.',
    traits: ['No sidebar: top nav + context strip', 'Dense KPI bar and compact tables', 'Status-first hierarchy', 'Best for: exam office, high data volume'],
  },
};

export const SCREENS = [
  { id: 'login', label: 'Login' },
  { id: 'admin', label: 'Admin dashboard' },
  { id: 'invigilator', label: 'Invigilator dashboard' },
  { id: 'scanner', label: 'OCR scanner' },
  { id: 'students', label: 'Students' },
  { id: 'exams', label: 'Examinations' },
  { id: 'users', label: 'Users & assignments' },
  { id: 'reports', label: 'Reports' },
];
