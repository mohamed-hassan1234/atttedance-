// Clearly fictional demo data for the design preview. Never sent anywhere.
export const DEMO_NOTE = 'Demo data — not real records';

export const students = [
  { id: 'HU00004698', name: 'Amina Hassan Ali', faculty: 'Computing & IT', dept: 'Software Engineering', fee: 'Cleared' },
  { id: 'HU00004712', name: 'Abdirahman Yusuf Nur', faculty: 'Computing & IT', dept: 'Networking', fee: 'Cleared' },
  { id: 'HU00004733', name: 'Hodan Omar Mohamud', faculty: 'Business', dept: 'Accounting', fee: 'Balance due' },
  { id: 'HU00004758', name: 'Mustafa Abdi Warsame', faculty: 'Engineering', dept: 'Civil Engineering', fee: 'Cleared' },
  { id: 'HU00004781', name: 'Sagal Ibrahim Farah', faculty: 'Health Sciences', dept: 'Nursing', fee: 'Cleared' },
  { id: 'HU00004802', name: 'Khadar Ahmed Dirie', faculty: 'Business', dept: 'Marketing', fee: 'Balance due' },
  { id: 'HU00004827', name: 'Ladan Mohamed Adan', faculty: 'Computing & IT', dept: 'Data Science', fee: 'Cleared' },
  { id: 'HU00004849', name: 'Bashir Hussein Jama', faculty: 'Law', dept: 'Sharia & Law', fee: 'Cleared' },
];

export const exams = [
  { id: 'e1', name: 'Database Systems — Final', faculty: 'Computing & IT', dept: 'Software Engineering', date: '2026-11-04', time: '09:00–11:00', room: 'Hall B2', inv: ['Fadumo Ali', 'Said Nur'], status: 'Live', present: 142, total: 168 },
  { id: 'e2', name: 'Financial Accounting II — Midterm', faculty: 'Business', dept: 'Accounting', date: '2026-11-04', time: '13:00–15:00', room: 'Hall A1', inv: ['Ahmed Jama'], status: 'Scheduled', present: 0, total: 120 },
  { id: 'e3', name: 'Structural Analysis — Final', faculty: 'Engineering', dept: 'Civil Engineering', date: '2026-11-05', time: '09:00–12:00', room: 'Hall C3', inv: ['Said Nur', 'Ifrah Abdi'], status: 'Scheduled', present: 0, total: 74 },
  { id: 'e4', name: 'Computer Networks — Final', faculty: 'Computing & IT', dept: 'Networking', date: '2026-11-02', time: '09:00–11:00', room: 'Hall B1', inv: ['Fadumo Ali'], status: 'Completed', present: 131, total: 140 },
  { id: 'e5', name: 'Anatomy I — Midterm', faculty: 'Health Sciences', dept: 'Nursing', date: '2026-11-02', time: '14:00–16:00', room: 'Hall D1', inv: ['Ifrah Abdi'], status: 'Completed', present: 88, total: 96 },
];

export const users = [
  { name: 'Mohamed Warsame', email: 'm.warsame@example.edu', role: 'Admin', status: 'Active', last: '5 min ago' },
  { name: 'Fadumo Ali', email: 'f.ali@example.edu', role: 'Invigilator', status: 'Active', last: '12 min ago' },
  { name: 'Said Nur', email: 's.nur@example.edu', role: 'Invigilator', status: 'Active', last: 'Yesterday' },
  { name: 'Ahmed Jama', email: 'a.jama@example.edu', role: 'Invigilator', status: 'Inactive', last: '3 weeks ago' },
  { name: 'Ifrah Abdi', email: 'i.abdi@example.edu', role: 'Invigilator', status: 'Active', last: '2 days ago' },
];

export const scans = [
  { time: '09:42:18', id: 'HU00004698', name: 'Amina Hassan Ali', result: 'Eligible', by: 'Fadumo Ali', exam: 'Database Systems — Final' },
  { time: '09:41:52', id: 'HU00004733', name: 'Hodan Omar Mohamud', result: 'Not Eligible', by: 'Fadumo Ali', exam: 'Database Systems — Final' },
  { time: '09:41:07', id: 'HU00004712', name: 'Abdirahman Yusuf Nur', result: 'Eligible', by: 'Said Nur', exam: 'Database Systems — Final' },
  { time: '09:40:31', id: 'HU00004698', name: 'Amina Hassan Ali', result: 'Duplicate', by: 'Said Nur', exam: 'Database Systems — Final' },
  { time: '09:39:44', id: 'HU00004827', name: 'Ladan Mohamed Adan', result: 'Eligible', by: 'Fadumo Ali', exam: 'Database Systems — Final' },
  { time: '09:38:20', id: 'HU00004802', name: 'Khadar Ahmed Dirie', result: 'Queued offline', by: 'Said Nur', exam: 'Database Systems — Final' },
];

export const trend = [
  { label: 'Mon', v: 412 }, { label: 'Tue', v: 538 }, { label: 'Wed', v: 466 },
  { label: 'Thu', v: 601 }, { label: 'Fri', v: 574 }, { label: 'Sat', v: 332 }, { label: 'Sun', v: 190 },
];

export const byExam = [
  { label: 'Databases', v: 85, total: 100 }, { label: 'Fin. Acc.', v: 78, total: 100 },
  { label: 'Networks', v: 94, total: 100 }, { label: 'Anatomy', v: 92, total: 100 }, { label: 'Structural', v: 71, total: 100 },
];

export const kpis = { students: 4286, exams: 38, attended: 3114, eligible: 2961, notEligible: 153 };
