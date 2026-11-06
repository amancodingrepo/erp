import { defaultAcademicYear } from "./school-options.js";

export const editTabs = ["Student Details", "Parent", "Fees", "Installmentwise Fee Summary", "Day Care", "Transport", "Immunization Schedule"];

export const defaultEditData = (student, saved = {}) => {
  const nameParts = (student.name || "").split(/\s+/);
  const fatherParts = (student.father || "").split(/\s+/);
  const motherParts = (student.parent || "").split(/\s+/);
  return {
    firstName: nameParts[0] || "", middleName: "", lastName: nameParts.slice(1).join(" ") || "",
    dob: student.dob || "", academicYear: defaultAcademicYear(student.academicYear),
    gender: student.gender || "Not specified", className: student.className || "",
    enrollmentDate: student.enrollmentDate || "", enrollmentNo: student.enrollmentNumber || "",
    rollNumber: student.rollNumber || "", house: student.house || "", lunchFromSchool: "No",
    aadhar: "", janAadhar: "", scholarNumber: "", sssmId: "",
    religion: "", category: student.category || "OTHER", caste: "", bloodGroup: student.bloodGroup || "",
    disability: "None selected", rteStudent: "No", nationality: student.nationality || "Indian",
    admittedClass: "", annualIncome: "", onlyChild: "Yes", pen: "", apaarId: "", grn: "", saralId: "",
    loginMethod: "Phone", email: student.email || "", primaryParent: student.primaryParent || "Mother",
    motherFirst: motherParts[0] || "", motherMiddle: "", motherLast: motherParts.slice(1).join(" ") || "",
    fatherFirst: fatherParts[0] || "", fatherMiddle: "", fatherLast: fatherParts.slice(1).join(" ") || "",
    guardianFirst: "", guardianMiddle: "", guardianLast: "", motherPhone: student.phone || "",
    alternatePhone: student.alternatePhone || "", alternateRelation: "Not Specified", motherDob: "",
    address: student.address || "", city: student.city || "", state: student.state || "Madhya Pradesh",
    zip: student.pinCode || "", country: "India",
    feeTotal: "32220.00", feePaid: "24050.00", feeUnpaid: "8150.00", dayCare: "No", checkInTime: "", checkOutTime: "", allowCCTV: "No",
    inRoute: "", inRouteStop: "", outRoute: "", outRouteStop: "", immunizations: [], ...saved
  };
};
