const MAX_ALLOWED_ABSENCES = 3;

// Student-level block: applies everywhere the student is identified (QR scan,
// manual ID lookup, exam attendance), independent of which exam is selected.
const checkStudentStanding = (student) => {
  const absenceCount = student.absenceCount || 0;
  if (absenceCount > MAX_ALLOWED_ABSENCES) {
    return {
      blocked: true,
      reason: `Rejected by attendance: ${absenceCount} absences recorded (more than ${MAX_ALLOWED_ABSENCES} is not allowed).`,
    };
  }
  if (student.feeStatus !== 'Cleared') {
    return {
      blocked: true,
      reason: "Rejected by finance: this month's payment has not been cleared.",
    };
  }
  return { blocked: false, reason: '' };
};

// Full eligibility check for recording attendance at a specific exam
// (FR-08, FR-09, FR-10): student standing first, then faculty/department match.
const checkEligibility = (student, exam) => {
  const standing = checkStudentStanding(student);
  if (standing.blocked) {
    return { eligible: false, reason: standing.reason };
  }
  if (student.faculty !== exam.faculty) {
    return { eligible: false, reason: `Student faculty (${student.faculty}) does not match exam faculty (${exam.faculty})` };
  }
  if (student.department !== exam.department) {
    return { eligible: false, reason: `Student department (${student.department}) does not match exam department (${exam.department})` };
  }
  return { eligible: true, reason: '' };
};

module.exports = { checkStudentStanding, checkEligibility, MAX_ALLOWED_ABSENCES };
