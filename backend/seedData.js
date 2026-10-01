/**
 * seedData.js
 * -----------------------------------------------------------------------
 * Populates the database with everything needed to explore the whole
 * Smart Examination Attendance Management System immediately:
 *   - Admin and Invigilator user accounts (with plain-text passwords
 *     printed to the console after seeding, since they are hashed in the DB)
 *   - A cached "University API" student directory
 *   - A set of scheduled examinations
 *   - A handful of realistic attendance records (eligible, not-eligible,
 *     and pending-sync) so dashboards and reports are not empty on first run
 *
 * Run with:  npm run seed   (or: node seedData.js)
 * WARNING: this wipes the relevant collections before reseeding.
 * -----------------------------------------------------------------------
 */

const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Student = require('./src/models/Student');
const Examination = require('./src/models/Examination');
const AttendanceRecord = require('./src/models/AttendanceRecord');
const SyncLog = require('./src/models/SyncLog');
const Faculty = require('./src/models/Faculty');
const Class = require('./src/models/Class');
const StudentQrToken = require('./src/models/StudentQrToken');
const QrScanRecord = require('./src/models/QrScanRecord');
const { assignStudentQrToken } = require('./src/utils/qrTokens');

const PLAIN_PASSWORDS = {
  admin1: 'Admin@123',
  admin2: 'Admin@123',
  invig1: 'Invigilator@123',
  invig2: 'Invigilator@123',
  invig3: 'Invigilator@123',
};

const seed = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Examination.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      SyncLog.deleteMany({}),
      Faculty.deleteMany({}),
      Class.deleteMany({}),
      StudentQrToken.deleteMany({}),
      QrScanRecord.deleteMany({}),
    ]);

    console.log('🏛️  Creating faculty / department master list...');
    await Faculty.create([
      { name: 'Computer Science', departments: ['Software Engineering', 'Information Technology'] },
      { name: 'Business', departments: ['Accounting', 'Marketing'] },
      { name: 'Engineering', departments: ['Civil Engineering'] },
    ]);

    console.log('🏫 Creating classes...');
    await Class.create([
      { name: 'SE Year 2', faculty: 'Computer Science', department: 'Software Engineering' },
      { name: 'IT Year 2', faculty: 'Computer Science', department: 'Information Technology' },
      { name: 'Accounting Year 3', faculty: 'Business', department: 'Accounting' },
      { name: 'Marketing Year 3', faculty: 'Business', department: 'Marketing' },
      { name: 'Civil Year 4', faculty: 'Engineering', department: 'Civil Engineering' },
    ]);

    console.log('👤 Creating users (Admin + Invigilator roles)...');
    const users = await User.create([
      {
        fullName: 'Amina Hassan (System Admin)',
        username: 'admin1',
        email: 'admin1@university.edu',
        password: PLAIN_PASSWORDS.admin1,
        role: 'admin',
      },
      {
        fullName: 'Mohamed Ali (Exams Officer)',
        username: 'admin2',
        email: 'admin2@university.edu',
        password: PLAIN_PASSWORDS.admin2,
        role: 'admin',
      },
      {
        fullName: 'Fartun Warsame',
        username: 'invig1',
        email: 'invig1@university.edu',
        invigilatorId: 'INV-001',
        phone: '+252610000001',
        password: PLAIN_PASSWORDS.invig1,
        role: 'invigilator',
      },
      {
        fullName: 'Abdirahman Yusuf',
        username: 'invig2',
        email: 'invig2@university.edu',
        invigilatorId: 'INV-002',
        phone: '+252610000002',
        password: PLAIN_PASSWORDS.invig2,
        role: 'invigilator',
      },
      {
        fullName: 'Sahra Nur',
        username: 'invig3',
        email: 'invig3@university.edu',
        invigilatorId: 'INV-003',
        phone: '+252610000003',
        password: PLAIN_PASSWORDS.invig3,
        role: 'invigilator',
      },
    ]);

    const [admin1, admin2, invig1, invig2, invig3] = users;

    console.log('🎓 Creating student directory (simulated University API cache)...');
    const students = await Student.create([
      { studentId: 'HU2001', fullName: 'Hodan Ibrahim', faculty: 'Computer Science', department: 'Software Engineering', feeStatus: 'Cleared', photoUrl: '', email: 'hodan.ibrahim@student.edu' },
      { studentId: 'HU2002', fullName: 'Khalid Omar', faculty: 'Computer Science', department: 'Software Engineering', feeStatus: 'Cleared', photoUrl: '', email: 'khalid.omar@student.edu' },
      { studentId: 'HU2003', fullName: 'Ifrah Abdullahi', faculty: 'Computer Science', department: 'Software Engineering', feeStatus: 'Not Cleared', photoUrl: '', email: 'ifrah.abdullahi@student.edu' },
      { studentId: 'HU2004', fullName: 'Yusuf Ahmed', faculty: 'Computer Science', department: 'Information Technology', feeStatus: 'Cleared', photoUrl: '', email: 'yusuf.ahmed@student.edu' },
      { studentId: 'HU2005', fullName: 'Nasra Mohamed', faculty: 'Computer Science', department: 'Information Technology', feeStatus: 'Cleared', photoUrl: '', email: 'nasra.mohamed@student.edu' },
      { studentId: 'HU2006', fullName: 'Bashir Adan', faculty: 'Computer Science', department: 'Information Technology', feeStatus: 'Not Cleared', photoUrl: '', email: 'bashir.adan@student.edu' },
      { studentId: 'HU3001', fullName: 'Faadumo Ali', faculty: 'Business', department: 'Accounting', feeStatus: 'Cleared', photoUrl: '', email: 'faadumo.ali@student.edu' },
      { studentId: 'HU3002', fullName: 'Cabdiraxmaan Sheikh', faculty: 'Business', department: 'Accounting', feeStatus: 'Cleared', absenceCount: 5, photoUrl: '', email: 'cabdiraxmaan.sheikh@student.edu' },
      { studentId: 'HU3003', fullName: 'Halima Warsame', faculty: 'Business', department: 'Marketing', feeStatus: 'Cleared', photoUrl: '', email: 'halima.warsame@student.edu' },
      { studentId: 'HU4001', fullName: 'Deeqa Farah', faculty: 'Engineering', department: 'Civil Engineering', feeStatus: 'Cleared', photoUrl: '', email: 'deeqa.farah@student.edu' },
    ]);

    for (const student of students) {
      await assignStudentQrToken(student);
    }

    console.log('📝 Creating examinations...');
    const today = new Date();
    const inDays = (n) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

    const exams = await Examination.create([
      {
        examName: 'Data Structures & Algorithms Final',
        courseCode: 'CS301',
        examDate: today,
        startTime: '09:00',
        endTime: '11:00',
        examRoom: 'Room A101',
        faculty: 'Computer Science',
        department: 'Software Engineering',
        requireFeeCheck: true,
        status: 'ongoing',
        assignedInvigilators: [invig1._id],
        createdBy: admin1._id,
      },
      {
        examName: 'Database Systems Midterm',
        courseCode: 'CS210',
        examDate: today,
        startTime: '13:00',
        endTime: '15:00',
        examRoom: 'Room A102',
        faculty: 'Computer Science',
        department: 'Information Technology',
        requireFeeCheck: true,
        status: 'scheduled',
        assignedInvigilators: [invig2._id],
        createdBy: admin1._id,
      },
      {
        examName: 'Principles of Accounting Final',
        courseCode: 'BUS205',
        examDate: inDays(1),
        startTime: '09:00',
        endTime: '11:30',
        examRoom: 'Room B201',
        faculty: 'Business',
        department: 'Accounting',
        requireFeeCheck: true,
        status: 'scheduled',
        assignedInvigilators: [invig3._id],
        createdBy: admin2._id,
      },
      {
        examName: 'Structural Engineering Final',
        courseCode: 'ENG410',
        examDate: inDays(-2),
        startTime: '09:00',
        endTime: '12:00',
        examRoom: 'Room C301',
        faculty: 'Engineering',
        department: 'Civil Engineering',
        requireFeeCheck: false,
        status: 'completed',
        assignedInvigilators: [invig1._id],
        createdBy: admin2._id,
      },
    ]);

    const [examDSA, examDB, examAcc, examEng] = exams;

    console.log('✅ Creating sample attendance records (eligible, not-eligible, pending sync)...');

    const findStudent = (id) => students.find((s) => s.studentId === id);

    const attendanceSeed = [
      // DSA exam - CS/Software Engineering students, all should be eligible except fee-blocked one
      { student: findStudent('HU2001'), exam: examDSA, invigilator: invig1, eligible: true, offline: false },
      { student: findStudent('HU2002'), exam: examDSA, invigilator: invig1, eligible: true, offline: false },
      { student: findStudent('HU2003'), exam: examDSA, invigilator: invig1, eligible: false, reason: 'Student fees are not cleared for this examination', offline: false },
      // DB exam - CS/IT students
      { student: findStudent('HU2004'), exam: examDB, invigilator: invig2, eligible: true, offline: false },
      { student: findStudent('HU2005'), exam: examDB, invigilator: invig2, eligible: true, offline: true, pending: true },
      // Completed engineering exam
      { student: findStudent('HU4001'), exam: examEng, invigilator: invig1, eligible: true, offline: false },
    ];

    for (const item of attendanceSeed) {
      const record = await AttendanceRecord.create({
        student: item.student._id,
        studentIdSnapshot: item.student.studentId,
        exam: item.exam._id,
        invigilator: item.invigilator._id,
        timeStamp: new Date(),
        syncStatus: item.pending ? 'Pending' : 'Synced',
        eligibilityStatus: item.eligible ? 'Eligible' : 'Not Eligible',
        eligibilityReason: item.reason || '',
        recordedOffline: !!item.offline,
      });

      if (!item.pending) {
        await SyncLog.create({
          attendanceRecord: record._id,
          syncResult: 'Success',
          message: item.offline ? 'Synced from offline device' : 'Recorded online',
        });
      }
    }

    console.log('\n================================================================');
    console.log('✅ DATABASE SEEDED SUCCESSFULLY');
    console.log('================================================================');
    console.log('You can now log in to the frontend with any of these accounts:\n');
    console.log('ROLE          USERNAME     EMAIL                        PASSWORD');
    console.log('----------------------------------------------------------------');
    console.log(`Admin         admin1       admin1@university.edu       ${PLAIN_PASSWORDS.admin1}`);
    console.log(`Admin         admin2       admin2@university.edu       ${PLAIN_PASSWORDS.admin2}`);
    console.log(`Invigilator   invig1       invig1@university.edu       ${PLAIN_PASSWORDS.invig1}`);
    console.log(`Invigilator   invig2       invig2@university.edu       ${PLAIN_PASSWORDS.invig2}`);
    console.log(`Invigilator   invig3       invig3@university.edu       ${PLAIN_PASSWORDS.invig3}`);
    console.log('----------------------------------------------------------------');
    console.log(`Students seeded : ${students.length} (try scanning e.g. HU2001 (eligible), HU2003 (fee not cleared), HU3002 (5 absences), HU3001)`);
    console.log(`Exams seeded    : ${exams.length}`);
    console.log(`Faculties seeded: 3 (Computer Science, Business, Engineering)`);
    console.log(`Classes seeded  : 5`);
    console.log(`Attendance rows : ${attendanceSeed.length}`);
    console.log('================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
