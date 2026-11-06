import { defaultAcademicYear } from "../../school-options.js";
export const FIELD_REQUIREMENT_OPTIONS = ["Required", "Optional", "Not Required"];

const f = (id, label, type = "text", enquiry = "Optional", admission = "Optional", options = null, note = "") => ({
  id, label, type, defaultEnquiry: enquiry, defaultAdmission: admission, options, note
});

export const ADMISSION_FIELD_GROUPS = [
  {
    id: "photo", label: "Student photo",
    description: "Recent passport-size photograph for the student record and ID card.",
    kind: "photo", fields: []
  },
  {
    id: "name", label: "Name + Gender", description: "Student's full name and gender.",
    fields: [
      f("firstName", "First name of the ward", "text", "Required", "Required"),
      f("middleName", "Middle name", "text"),
      f("lastName", "Last name / surname", "text", "Optional", "Required"),
      f("gender", "Gender", "select", "Required", "Required", ["Male", "Female", "Other"])
    ]
  },
  {
    id: "dob", label: "Date of birth with age", description: "Date of birth and age-related information.",
    fields: [
      f("dob", "Date of birth", "date", "Required", "Required"),
      f("dobWords", "Date of birth in words", "computed"),
      f("ageAtAdmission", "Age as on admission date", "text")
    ]
  },
  {
    id: "contact", label: "Primary contact info", description: "Phone numbers and email addresses for communication.",
    fields: [
      f("mobile", "Primary contact number", "tel", "Required", "Required"),
      f("alternateMobile", "Alternate contact number", "tel"),
      f("email", "Email address", "email"),
      f("emergency", "Emergency contact number", "tel", "Optional", "Required"),
      f("contactPreference", "Preferred contact method", "select", "Optional", "Optional", ["Phone", "SMS", "Email", "WhatsApp"])
    ]
  },
  {
    id: "father", label: "Father Information", description: "Father or primary guardian details.",
    fields: [
      f("fatherName", "Father's full name", "text", "Optional", "Required"),
      f("fatherMobile", "Father contact number", "tel"),
      f("fatherEmail", "Father email ID", "email"),
      f("fatherQualification", "Father's qualification"),
      f("fatherOccupation", "Father's occupation"),
      f("fatherOfficeAddress", "Office / business address"),
      f("fatherAnnualIncome", "Annual income", "number"),
      f("fatherCompany", "Company / organization"),
      f("fatherDesignation", "Designation")
    ]
  },
  {
    id: "mother", label: "Mother Information", description: "Mother or guardian details.",
    fields: [
      f("motherName", "Mother's full name", "text", "Optional", "Required"),
      f("motherMobile", "Mother contact number", "tel"),
      f("motherEmail", "Mother email ID", "email"),
      f("motherQualification", "Mother's qualification"),
      f("motherOccupation", "Mother's occupation"),
      f("motherOfficeAddress", "Office / business address"),
      f("motherAnnualIncome", "Annual income", "number"),
      f("motherCompany", "Company / organization"),
      f("motherDesignation", "Designation")
    ]
  },
  {
    id: "class", label: "Class info", description: "Class applied for and admission details.",
    fields: [
      f("className", "Class applied for", "select", "Required", "Required", ["PRE NURSERY", "NURSERY", "LKG", "UKG", "CLASS 1", "CLASS 2", "CLASS 3", "CLASS 4", "CLASS 5", "CLASS 6", "CLASS 7", "CLASS 8", "CLASS 9", "CLASS 10", "CLASS 11", "CLASS 12"]),
      f("admissionDate", "Admission date", "date"),
      f("admissionType", "Admission type", "select", "Optional", "Optional", ["New Admission", "Transfer", "Re-admission"]),
      f("rollNumber", "Roll number"),
      f("previousClass", "Previous class attended")
    ]
  },
  {
    id: "previous", label: "Previous school info", description: "Previous school name, board, and academic record.",
    fields: [
      f("previousSchool", "Previous school name"),
      f("previousBoard", "Board", "select", "Optional", "Optional", ["CBSE", "ICSE", "State Board", "Other"]),
      f("previousAddress", "Previous school address"),
      f("lastExam", "Last examination taken"),
      f("lastExamResult", "Result / grade"),
      f("lastExamPercentage", "Percentage / marks", "number"),
      f("transferReason", "Reason for leaving")
    ]
  },
  {
    id: "identity", label: "Aadhaar + social IDs", description: "Identity and school identification numbers.",
    fields: [
      f("aadhar", "Aadhaar number"),
      f("janAadhar", "Jan Aadhaar number"),
      f("sssmId", "SSSM ID number"),
      f("scholarNumber", "Scholar number"),
      f("samagraId", "Samagra ID"),
      f("nationalStudentId", "National student ID")
    ]
  },
  {
    id: "nationality", label: "Nationality and other details", description: "Nationality, religion, category and demographic details.",
    fields: [
      f("nationality", "Nationality", "text", "Optional", "Required"),
      f("religion", "Religion", "select", "Optional", "Optional", ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"]),
      f("caste", "Caste"),
      f("category", "Category", "select", "Optional", "Optional", ["General", "OBC", "SC", "ST", "EWS", "Other"]),
      f("bloodGroup", "Blood group", "select", "Optional", "Optional", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
      f("motherTongue", "Mother tongue"),
      f("minorityStatus", "Belongs to minority"),
      f("nationalityProof", "Nationality proof details")
    ]
  },
  {
    id: "address", label: "Address in Detail", description: "Permanent and current residential address.",
    fields: [
      f("permanentAddress", "Permanent residential address", "textarea", "Required", "Required"),
      f("permanentPin", "Permanent address PIN code"),
      f("currentAddress", "Current address", "textarea"),
      f("currentPin", "Current address PIN code"),
      f("state", "State", "text", "Optional", "Required"),
      f("city", "City / district", "text", "Required", "Required"),
      f("country", "Country", "text", "Optional", "Required"),
      f("lankmark", "Landmark"),
      f("residenceType", "Residence type", "select", "Optional", "Optional", ["Owned", "Rented", "Other"])
    ]
  },
  {
    id: "health", label: "Health Status", description: "Medical conditions and health support details.",
    fields: [
      f("healthConditions", "Specific disease suffered in the past", "textarea"),
      f("previousOperations", "Operations undergone in the past", "textarea"),
      f("chronicIllness", "Chronic illness", "textarea"),
      f("regularMedication", "Regular medication", "textarea"),
      f("allergies", "Known allergies", "textarea"),
      f("otherHealthInfo", "Any other health information", "textarea"),
      f("doctorContact", "Doctor / clinic contact")
    ]
  },
  {
    id: "bank", label: "Bank Info (Mother/Father)", description: "Bank account information where required by the school.",
    fields: [
      f("bankAccountHolder", "Name of account holder"),
      f("bankName", "Bank name"),
      f("bankAccountNumber", "Bank account number"),
      f("bankIFSC", "Bank IFSC code"),
      f("bankBranch", "Bank branch")
    ]
  },
  {
    id: "social", label: "Social No.", description: "Scholar and related registration numbers.",
    fields: [
      f("socialScholarNo", "Scholar number"),
      f("socialStudentId", "Student ID"),
      f("socialRegistrationNo", "Registration number")
    ]
  },
  {
    id: "siblings", label: "Siblings list (if any)", description: "Sibling names and current school details.",
    fields: [
      f("siblings", "Sibling names / IDs", "textarea"),
      f("siblingSchool", "Sibling's school"),
      f("siblingClass", "Sibling's class"),
      f("siblingRelation", "Relationship"),
      f("siblingAdmissionNo", "Sibling admission number")
    ]
  },
  {
    id: "transport", label: "Transport facility", description: "Transport requirement and route details.",
    fields: [
      f("transportFacility", "Transport facility required", "select", "Optional", "Optional", ["Yes", "No"]),
      f("routeName", "Bus route / route name"),
      f("busStop", "Bus stop"),
      f("pickupPoint", "Pickup point"),
      f("dropPoint", "Drop point")
    ]
  },
  {
    id: "special-needs", label: "Special Learning Needs", description: "Learning support needs or disability-related information.",
    fields: [
      f("specialLearningNeeds", "Any special learning needs", "textarea"),
      f("physicalDisability", "Physical disability", "select", "Optional", "Optional", ["No", "Yes"]),
      f("disabilityDetails", "Disability support details", "textarea"),
      f("learningSupport", "Learning support / accommodations", "textarea")
    ]
  },
  {
    id: "activities", label: "Sports / Activity", description: "Sports, hobbies and extracurricular activities.",
    fields: [
      f("sportsActivity", "Sports / activity you are interested in", "textarea"),
      f("hobbies", "Hobbies"),
      f("specialAchievements", "Special achievements", "textarea"),
      f("achievements", "Achievements (if any)", "textarea")
    ]
  },
  {
    id: "academic-record", label: "Academic record at last exam", description: "Previous academic results.",
    fields: [
      f("previousExamName", "Examination name"),
      f("previousExamYear", "Examination year"),
      f("previousExamMarks", "Marks obtained"),
      f("previousExamPercentage", "Percentage", "number"),
      f("previousExamGrade", "Grade"),
      f("academicRemarks", "Academic remarks", "textarea")
    ]
  },
  {
    id: "documents", label: "Required documents", description: "Documents to submit along with the form.",
    kind: "documents", fields: [
      f("documents", "Documents checklist", "textarea", "Optional", "Required"),
      f("birthCertificate", "Birth certificate", "select", "Optional", "Required", ["Required", "Submitted", "Not available"]),
      f("transferCertificate", "Transfer certificate", "select", "Optional", "Optional", ["Required", "Submitted", "Not available"]),
      f("studentPhotoDocument", "Student photograph", "select", "Optional", "Required", ["Required", "Submitted", "Not available"]),
      f("identityProof", "Identity proof", "select", "Optional", "Optional", ["Required", "Submitted", "Not available"])
    ]
  },
  {
    id: "fee-form", label: "Fee Form", description: "Fee and payment-related admission information.",
    fields: [
      f("feeForm", "Fee form", "select", "Optional", "Optional", ["Admission fee", "Application fee", "No fee"]),
      f("feeDetails", "Fee details / notes", "textarea"),
      f("concessionRequired", "Concession / scholarship requested", "select", "Optional", "Optional", ["No", "Yes"]),
      f("concessionDetails", "Concession details", "textarea")
    ]
  },
  {
    id: "misc", label: "Miscellaneous", description: "Additional notes and admission source.",
    fields: [
      f("referralSource", "How did you hear about the school?"),
      f("personResponsible", "Person responsible at home"),
      f("specialRemarks", "Remarks / special request", "textarea"),
      f("applicationDeclaration", "Declaration confirmed", "select", "Optional", "Required", ["Yes", "No"])
    ]
  }
];

export const DEFAULT_ADMISSION_GROUP_IDS = [
  "photo", "name", "dob", "contact", "father", "mother",
  "class", "previous", "identity", "nationality", "address", "documents"
];

export function createGroupSelection(groupId) {
  const group = ADMISSION_FIELD_GROUPS.find(item => item.id === groupId);
  if (!group) return null;
  const settings = {};
  for (const field of group.fields) {
    settings[field.id] = {
      enquiry: field.defaultEnquiry,
      admission: field.defaultAdmission
    };
  }
  return { groupId, settings };
}

export function createDefaultAdmissionForm(academicYear = defaultAcademicYear(), name = "Admission/Enquiry Form") {
  return {
    id: `admission-form-${Date.now().toString(36)}`,
    name,
    academicYear,
    status: "Open",
    fields: DEFAULT_ADMISSION_GROUP_IDS.map(createGroupSelection).filter(Boolean),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function getFieldSetting(form, groupId, fieldId, formType = "enquiry") {
  const group = form?.fields?.find(item => item.groupId === groupId);
  const setting = group?.settings?.[fieldId]?.[formType];
  return FIELD_REQUIREMENT_OPTIONS.includes(setting) ? setting : "Optional";
}
