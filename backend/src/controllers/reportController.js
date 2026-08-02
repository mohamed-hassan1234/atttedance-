const AttendanceRecord = require('../models/AttendanceRecord');
const Examination = require('../models/Examination');

// @desc  Overview statistics for the Admin dashboard
// @route GET /api/reports/overview
const getOverview = async (req, res, next) => {
  try {
    const totalExams = await Examination.countDocuments();
    const totalPresent = await AttendanceRecord.countDocuments({ eligibilityStatus: 'Eligible' });
    const totalNotEligible = await AttendanceRecord.countDocuments({ eligibilityStatus: 'Not Eligible' });
    const totalPending = await AttendanceRecord.countDocuments({ syncStatus: 'Pending' });
    const totalRecords = await AttendanceRecord.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        totalExams,
        totalRecords,
        totalPresent,
        totalNotEligible,
        totalPending,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Attendance rate grouped by faculty/department
// @route GET /api/reports/by-department
const getByDepartment = async (req, res, next) => {
  try {
    const results = await AttendanceRecord.aggregate([
      {
        $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentInfo' },
      },
      { $unwind: '$studentInfo' },
      {
        $group: {
          _id: { faculty: '$studentInfo.faculty', department: '$studentInfo.department' },
          total: { $sum: 1 },
          eligible: { $sum: { $cond: [{ $eq: ['$eligibilityStatus', 'Eligible'] }, 1, 0] } },
          notEligible: { $sum: { $cond: [{ $eq: ['$eligibilityStatus', 'Not Eligible'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.faculty': 1, '_id.department': 1 } },
    ]);

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getByDepartment };
