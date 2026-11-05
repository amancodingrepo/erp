import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDatabaseSession } from "../../../DatabaseSession.jsx";
import {
  AlertCircle, ArrowLeft, Camera, CheckCircle2, Copy, Download, FileImage,
  IdCard, KeyRound, Mail, Phone, Plus, Printer, RefreshCw, Save, Search, Upload,
  ShieldCheck, Trash2, UserCheck, UserPlus, UserRound, UserX, X
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "../../../api.js";
import "./ManageStaffPage.css";
import ManageStaffBulkUpload from "./ManageStaffBulkUpload.jsx";

const EMPTY_FORM = {
  firstName: "", middleName: "", lastName: "", designation: "",
  loginMethod: "Phone", email: "", password: "", phone: "", alternatePhone: "",
  dateOfBirth: "", joiningDate: "", anniversaryDate: "", bloodGroup: "",
  address: "", city: "", state: "", zip: "", country: "India",
  employeeCode: "", gender: "Not Specified", religion: "", nationality: "",
  caste: "", category: "", voterId: "", maritalStatus: "Unmarried",
  staffBankName: "", employerEpfNumber: "", schoolBankName: "",
  bankAccountNumber: "", ifscCode: "", pfNumber: "", staffCategory: "",
  biometricIds: [""], aadharNumber: "", panNumber: "", fatherName: "",
  husbandWifeName: "", role: "staff", esiNumber: "", officeTimingsFrom: "",
  officeTimingsTo: "", experience: "", roleCategories: [], photoDataUrl: ""
};
const ROLE_CATEGORIES = ["Fees", "Transport", "Uniforms", "Library", "Academics", "Others"];
const BANKS = [
  "-- Select Bank --", "State Bank of India", "HDFC Bank", "ICICI Bank",
  "Axis Bank", "Punjab National Bank", "Bank of Baroda", "Canara Bank",
  "Union Bank of India", "Kotak Mahindra Bank", "IDFC FIRST Bank", "Other"
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const ROLE_OPTIONS = [
  { value: "staff", label: "Sub Admin / Staff" },
  { value: "teacher", label: "Teacher" },
  { value: "principal", label: "Principal" },
  { value: "school_admin", label: "School Admin" },
  { value: "transport_admin", label: "Transport Admin" }
];
const CSV_FIELDS = [
  ["Employee Code", "employeeCode"], ["First Name", "firstName"], ["Middle Name", "middleName"],
  ["Last Name", "lastName"], ["Full Name", "fullName"], ["Designation", "designation"],
  ["Login Method", "loginMethod"], ["Email", "email"], ["Phone", "phone"],
  ["Alternate Phone", "alternatePhone"], ["Date of Birth", "dateOfBirth"],
  ["Joining Date", "joiningDate"], ["Anniversary Date", "anniversaryDate"],
  ["Blood Group", "bloodGroup"], ["Address", "address"], ["City", "city"], ["State", "state"],
  ["ZIP", "zip"], ["Country", "country"], ["Gender", "gender"], ["Religion", "religion"],
  ["Nationality", "nationality"], ["Caste", "caste"], ["Category", "category"],
  ["Voter ID", "voterId"], ["Marital Status", "maritalStatus"], ["Staff Category", "staffCategory"],
  ["Staff Bank Name", "staffBankName"], ["Employer EPF Number", "employerEpfNumber"],
  ["School Bank Name", "schoolBankName"], ["Bank Account Number", "bankAccountNumber"],
  ["IFSC Code", "ifscCode"], ["PF Number", "pfNumber"], ["Biometric IDs", "biometricIds"],
  ["Aadhaar Number", "aadharNumber"], ["PAN Number", "panNumber"], ["Father Name", "fatherName"],
  ["Husband/Wife Name", "husbandWifeName"], ["Role", "role"], ["ESI Number", "esiNumber"],
  ["Office Timings From", "officeTimingsFrom"], ["Office Timings To", "officeTimingsTo"],
  ["Experience", "experience"], ["Role Categories", "roleCategories"],
  ["Status", "status"], ["Last Seen", "lastSeen"]
];

function initials(name) {
  return String(name || "Staff").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "ST";
}
function fullNameFromForm(form) {
  return [form.firstName, form.middleName, form.lastName].map(value => String(value || "").trim()).filter(Boolean).join(" ");
}
function generateEmployeeCode(existingStaff = []) {
  const used = new Set(existingStaff.map(person =>
    String(person.externalId || staffDetailsOf(person).employeeCode || "").trim().toUpperCase()
  ).filter(Boolean));
  for (let attempt = 0; attempt < 24; attempt++) {
    const randomValues = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(randomValues);
    else randomValues[0] = Math.floor(Math.random() * 0xFFFFFFFF);
    const candidate = "STF-" + new Date().getFullYear() + "-" + randomValues[0].toString(36).toUpperCase().padStart(7, "0");
    if (!used.has(candidate)) return candidate;
  }
  return "STF-" + new Date().getFullYear() + "-" + Date.now().toString(36).toUpperCase();
}
function staffDetailsOf(person) {
  const details = person?.metadata?.staffDetails;
  return details && typeof details === "object" ? details : {};
}
function formFromPerson(person, account, categoryAssignments = {}) {
  const details = staffDetailsOf(person);
  const pieces = String(person?.fullName || "").trim().split(/\s+/);
  return {
    ...EMPTY_FORM, ...details,
    firstName: person?.firstName ?? details.firstName ?? pieces[0] ?? "",
    middleName: person?.middleName ?? details.middleName ?? "",
    lastName: person?.lastName ?? details.lastName ?? pieces.slice(1).join(" "),
    designation: details.designation ?? "",
    loginMethod: details.loginMethod ?? "Phone",
    email: person?.email ?? details.email ?? "",
    password: "",
    phone: person?.contactNumber ?? details.phone ?? "",
    alternatePhone: person?.alternateContactNumber ?? details.alternatePhone ?? "",
    dateOfBirth: String(person?.dateOfBirth || details.dateOfBirth || "").slice(0, 10),
    address: person?.address ?? details.address ?? "",
    city: person?.city ?? details.city ?? "",
    state: person?.state ?? details.state ?? "",
    gender: person?.gender ?? details.gender ?? "Not Specified",
    employeeCode: person?.externalId ?? details.employeeCode ?? "",
    staffCategory: categoryAssignments[String(person?.id)]?.categoryId || "",
    role: account?.role ?? details.role ?? (person?.personType === "teacher" ? "teacher" : "staff"),
    biometricIds: Array.isArray(details.biometricIds) && details.biometricIds.length ? details.biometricIds : [""],
    roleCategories: Array.isArray(details.roleCategories) ? details.roleCategories : [],
    photoDataUrl: details.photoDataUrl || ""
  };
}
function metadataForForm(person, form) {
  const details = { ...form };
  delete details.password;
  delete details.staffCategory;
  return {
    ...(person?.metadata && typeof person.metadata === "object" ? person.metadata : {}),
    staffDetails: details
  };
}
function isPersonActive(person, account) {
  return String(person?.status || "Active").toLowerCase() === "active" && (account ? Boolean(account.isActive) : true);
}
function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function saveBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}
function normalizeDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function formatStaffDate(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  if (match) return match[3] + "/" + match[2] + "/" + match[1];
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString();
}
function phoneLoginAlias(personId) {
  return "staff-" + String(personId || "").replace(/[^a-zA-Z0-9]/g, "") + "@phone-login.schoolworld.invalid";
}
async function compressPhoto(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Choose a valid image file.");
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The selected image could not be opened."));
      img.src = imageUrl;
    });
    const maxSide = 600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Photo processing is not supported in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
function getStaffExportValue(person, account, key) {
  const details = staffDetailsOf(person);
  const values = {
    employeeCode: person.externalId || details.employeeCode,
    firstName: person.firstName || details.firstName,
    middleName: person.middleName || details.middleName,
    lastName: person.lastName || details.lastName,
    fullName: person.fullName,
    loginMethod: details.loginMethod,
    email: person.email || details.email,
    phone: person.contactNumber || details.phone,
    alternatePhone: person.alternateContactNumber || details.alternatePhone,
    dateOfBirth: person.dateOfBirth || details.dateOfBirth,
    status: isPersonActive(person, account) ? "Active" : "Inactive",
    lastSeen: person.lastSeen
  };
  return values[key] !== undefined ? values[key] : details[key];
}
async function createIdCardJpeg(person, schoolName, logoSrc) {
  const details = staffDetailsOf(person);
  const canvas = document.createElement("canvas");
  // Draw at higher resolution while mirroring the visible HTML ID card.
  canvas.width = 1200;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ID card image could not be generated in this browser.");

  const roundedRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };
  const fillRoundRect = (x, y, w, h, r, color) => {
    roundedRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const wrapCanvasText = (value, maxWidth, font, maxLines = 2) => {
    ctx.font = font;
    const words = String(value || "—").trim().split(/\s+/).filter(Boolean);
    const output = [];
    let line = "";
    for (const word of words.length ? words : ["—"]) {
      if (ctx.measureText(word).width > maxWidth) {
        if (line) {
          output.push(line);
          line = "";
        }
        let piece = "";
        for (const character of word) {
          if (piece && ctx.measureText(piece + character).width > maxWidth) {
            output.push(piece);
            piece = character;
          } else {
            piece += character;
          }
        }
        line = piece;
        continue;
      }
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        if (line) output.push(line);
        line = word;
      }
    }
    if (line) output.push(line);
    if (output.length > maxLines) {
      output.length = maxLines;
      let last = output[maxLines - 1];
      while (last.length && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
      output[maxLines - 1] = last.trimEnd() + "…";
    }
    return output;
  };
  const drawWrappedText = (value, x, baseline, maxWidth, lineHeight, font, color, maxLines = 2) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    const lines = wrapCanvasText(value, maxWidth, font, maxLines);
    lines.forEach((line, index) => ctx.fillText(line, x, baseline + index * lineHeight, maxWidth));
    return lines.length;
  };
  const drawImageCover = (image, x, y, width, height, radius) => {
    ctx.save();
    roundedRect(x, y, width, height, radius);
    ctx.clip();
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.restore();
  };
  const loadImage = src => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded for the ID card."));
    image.src = src;
  });

  // Outer card and header match the on-screen card's dimensions, borders and colours.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  fillRoundRect(12, 12, 1176, 596, 22, "#ffffff");
  ctx.strokeStyle = "#dbe8e3";
  ctx.lineWidth = 2;
  roundedRect(12, 12, 1176, 596, 22);
  ctx.stroke();

  fillRoundRect(12, 12, 1176, 160, 22, "#0a4039");
  ctx.fillStyle = "#0a4039";
  ctx.fillRect(12, 145, 1176, 27);

  // School logo: same asset and contain behaviour as the visible preview.
  fillRoundRect(48, 40, 104, 104, 11, "#ffffff");
  try {
    const logo = await loadImage(logoSrc);
    const logoScale = Math.min(88 / logo.naturalWidth, 88 / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * logoScale;
    const logoHeight = logo.naturalHeight * logoScale;
    ctx.drawImage(logo, 100 - logoWidth / 2, 92 - logoHeight / 2, logoWidth, logoHeight);
  } catch {}
  const headerName = String(schoolName || "").trim();
  let headerFontSize = 34;
  ctx.font = "800 " + headerFontSize + "px Arial";
  while (headerFontSize > 22 && ctx.measureText(headerName).width > 940) {
    headerFontSize -= 1;
    ctx.font = "800 " + headerFontSize + "px Arial";
  }
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(headerName, 176, 83, 940);
  ctx.font = "700 16px Arial";
  ctx.fillText("STAFF IDENTITY CARD", 176, 118);

  // Main section: staff portrait on the left and the same five details on the right.
  const photoX = 51, photoY = 211, photoW = 277, photoH = 310;
  fillRoundRect(photoX, photoY, photoW, photoH, 16, "#f0f6f3");
  const photo = details.photoDataUrl;
  if (photo) {
    try {
      const staffPhoto = await loadImage(photo);
      drawImageCover(staffPhoto, photoX, photoY, photoW, photoH, 16);
    } catch {}
  } else {
    // Approximate the UserRound placeholder used in the HTML preview.
    ctx.strokeStyle = "#93a49c";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(photoX + photoW / 2, photoY + 116, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(photoX + photoW / 2 - 43, photoY + 206);
    ctx.bezierCurveTo(photoX + photoW / 2 - 43, photoY + 163, photoX + photoW / 2 + 43, photoY + 163, photoX + photoW / 2 + 43, photoY + 206);
    ctx.stroke();
  }
  ctx.strokeStyle = "#dce7e2";
  ctx.lineWidth = 2;
  roundedRect(photoX, photoY, photoW, photoH, 16);
  ctx.stroke();

  const detailX = 365;
  const detailWidth = 784;
  const shownName = person.fullName || fullNameFromForm(details) || "Unnamed staff";
  const nameLineCount = drawWrappedText(shownName, detailX, 245, detailWidth, 40, "800 34px Arial", "#1d3c36", 2);
  const designation = details.designation || (person.personType === "teacher" ? "Teacher" : "Staff");
  const designationBaseline = 284 + (nameLineCount - 1) * 40;
  drawWrappedText(designation, detailX, designationBaseline, detailWidth, 24, "650 19px Arial", "#317267", 1);

  const fields = [
    { label: "Employee Code", value: person.externalId || details.employeeCode || "—" },
    { label: "Date of Joining", value: formatStaffDate(details.joiningDate) },
    { label: "Phone", value: person.contactNumber || details.phone || "—" },
    { label: "Email", value: person.email || details.email || "—" },
    { label: "Blood Group", value: details.bloodGroup || "—" }
  ];
  const columnGap = 26;
  const columnWidth = (detailWidth - columnGap) / 2;
  const columns = [detailX, detailX + columnWidth + columnGap];
  const rows = [[fields[0], fields[1]], [fields[2], fields[3]], [fields[4]]];
  let rowY = designationBaseline + 45;
  rows.forEach(row => {
    let rowLineCount = 1;
    row.forEach((field, columnIndex) => {
      const x = columns[columnIndex];
      ctx.font = "750 15px Arial";
      ctx.fillStyle = "#7a8c86";
      ctx.textAlign = "left";
      ctx.fillText(field.label.toUpperCase(), x, rowY, columnWidth);
      const valueFont = "600 20px Arial";
      const valueLines = drawWrappedText(field.value, x, rowY + 28, columnWidth, 21, valueFont, "#2a443f", 2);
      rowLineCount = Math.max(rowLineCount, valueLines);
    });
    rowY += 28 + rowLineCount * 21 + 21;
  });

  // Footer matches the on-screen card's text and divider.
  ctx.strokeStyle = "#e7efeb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 560);
  ctx.lineTo(1188, 560);
  ctx.stroke();
  ctx.fillStyle = "#7b8c86";
  ctx.font = "400 16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Keep this card available for school identification.", 48, 589, 1100);

  return await new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error("ID card image export failed.")),
    "image/jpeg",
    0.94
  ));
}
export default function ManageStaffPage({ onBack, notify, t }) {
  const text = typeof t === "function" ? t : value => value;
  const [staff, setStaff] = useState([]);
  const [staffCategories, setStaffCategories] = useState([]);
  const [staffCategoryByPersonId, setStaffCategoryByPersonId] = useState({});
  const [accountsByPersonId, setAccountsByPersonId] = useState({});
  const [school, setSchool] = useState({ name: "" });
  // ID cards carry this school's own logo (or none), never a built-in one.
  const sessionSchool = useDatabaseSession().user?.school;
  const schoolLogo = sessionSchool?.logoUrl || "";
  // The card always carries the school's own name: the loaded settings, else the signed-in school.
  const cardSchoolName = school.name || sessionSchool?.name || "";
  const [activeTab, setActiveTab] = useState("Active");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyPersonId, setBusyPersonId] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [passwordDialog, setPasswordDialog] = useState(null);
  const [statusDialog, setStatusDialog] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const formRef = useRef(null);
  const photoInputRef = useRef(null);

  async function loadStaff(options = {}) {
    const showLoading = options.showLoading !== false;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const response = await apiGet("/people");
      const people = Array.isArray(response?.people) ? response.people : [];
      setStaff(people
        .filter(person => ["staff", "teacher"].includes(String(person.personType || "").toLowerCase()))
        .sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || ""))));
    } catch (requestError) {
      setError(requestError?.message || "Staff records could not be loaded. Please refresh and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  async function loadStaffCategories() {
    try {
      const response = await apiGet("/staff-categories");
      setStaffCategories(Array.isArray(response?.categories) ? response.categories : []);
    } catch (requestError) {
      setStaffCategories([]);
      setError(requestError?.message || "Staff categories could not be loaded.");
    }
  }
  async function loadStaffCategoryAssignments() {
    try {
      const response = await apiGet("/staff-category-assignments");
      const next = {};
      (Array.isArray(response?.assignments) ? response.assignments : []).forEach(assignment => {
        next[String(assignment.personId)] = {
          categoryId: String(assignment.categoryId),
          categoryName: assignment.categoryName || "",
          categoryActive: Boolean(assignment.categoryActive)
        };
      });
      setStaffCategoryByPersonId(next);
    } catch (requestError) {
      setStaffCategoryByPersonId({});
      setError(requestError?.message || "Staff category assignments could not be loaded.");
    }
  }
  async function loadAccounts() {
    try {
      const response = await apiGet("/users");
      const next = {};
      (Array.isArray(response?.users) ? response.users : []).forEach(account => {
        if (account.personId) next[String(account.personId)] = account;
      });
      setAccountsByPersonId(next);
    } catch {
      setAccountsByPersonId({});
    }
  }
  async function loadSchool() {
    try {
      const response = await apiGet("/bootstrap");
      if (response?.school) setSchool(response.school);
    } catch {}
  }
  async function refreshAll() {
    await Promise.all([loadStaff({ showLoading: false }), loadAccounts(), loadStaffCategories(), loadStaffCategoryAssignments()]);
  }
  useEffect(() => {
    void loadStaff();
    void loadAccounts();
    void loadSchool();
    void loadStaffCategories();
    void loadStaffCategoryAssignments();
  }, []);

  const activeCount = useMemo(() => staff.filter(person => isPersonActive(person, accountsByPersonId[String(person.id)])).length, [staff, accountsByPersonId]);
  const inactiveCount = staff.length - activeCount;
  const visibleStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter(person => {
      const active = isPersonActive(person, accountsByPersonId[String(person.id)]);
      if (activeTab === "Active" ? !active : active) return false;
      if (!query) return true;
      const details = staffDetailsOf(person);
      return [
        person.fullName, person.email, person.contactNumber, person.alternateContactNumber,
        person.externalId, person.personType, details.designation, staffCategoryByPersonId[String(person.id)]?.categoryName,
        details.employeeCode, details.role, details.religion, details.nationality
      ].some(value => String(value || "").toLowerCase().includes(query));
    });
  }, [staff, activeTab, search, accountsByPersonId, staffCategoryByPersonId]);

  function clearNotices() {
    setError("");
    setFeedback("");
    setCopyMessage("");
  }
  function openAddForm() {
    clearNotices();
    setEditingPerson(null);
    setForm({ ...EMPTY_FORM, employeeCode: generateEmployeeCode(staff), biometricIds: [""], roleCategories: [] });
    setFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function openEditForm(person) {
    clearNotices();
    setEditingPerson(person);
    setForm(formFromPerson(person, accountsByPersonId[String(person.id)], staffCategoryByPersonId));
    setFormOpen(true);
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }
  function closeForm() {
    clearNotices();
    setFormOpen(false);
    setEditingPerson(null);
    setForm(EMPTY_FORM);
  }
  function updateForm(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }
  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const photoDataUrl = await compressPhoto(file);
      updateForm("photoDataUrl", photoDataUrl);
      setError("");
      setFeedback("Profile photo is ready. Save the form to store it.");
    } catch (photoError) {
      setError(photoError?.message || "The selected photo could not be processed.");
    }
  }
  function roleAccountEmail(personId) {
    if (form.email.trim()) return form.email.trim().toLowerCase();
    return phoneLoginAlias(personId);
  }
  async function createLoginAccount(personId, userRole) {
    return apiPost("/users", {
      personId,
      email: roleAccountEmail(personId),
      password: form.password,
      role: userRole,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim()
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearNotices();
    const fullName = fullNameFromForm(form);
    const hasAccount = Boolean(editingPerson && accountsByPersonId[String(editingPerson.id)]);
    if (!form.firstName.trim()) return setError("First Name is required.");
    if (!form.designation.trim()) return setError("Designation is required.");
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.joiningDate) return setError("Joining Date is required.");
    if (form.loginMethod === "Email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setError("Enter a valid email address for Email login.");
    }
    if ((!editingPerson || !hasAccount) && form.password.length < 10) {
      return setError("Enter a password with at least 10 characters to create the staff login account.");
    }
    if (form.password && form.password.length < 10) return setError("Password must contain at least 10 characters.");

    setSaving(true);
    let savedPersonId = editingPerson ? String(editingPerson.id) : "";
    let profileSaved = false;
    let accountError = "";
    let categoryError = "";
    try {
      const payload = {
        personType: form.role === "teacher" ? "teacher" : "staff",
        externalId: form.employeeCode.trim(),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        fullName,
        email: form.email.trim(),
        contactNumber: form.phone.trim(),
        alternateContactNumber: form.alternatePhone.trim(),
        dateOfBirth: form.dateOfBirth || "",
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        gender: form.gender,
        status: editingPerson?.status || "Active",
        metadata: metadataForForm(editingPerson, form)
      };
      if (editingPerson) {
        await apiPatch("/people/" + encodeURIComponent(savedPersonId), payload);
      } else {
        const response = await apiPost("/people", payload);
        savedPersonId = String(response?.person?.id || "");
        if (!savedPersonId) throw new Error("The staff profile was saved but the server did not return its record ID.");
      }
      profileSaved = true;
      try {
        await apiPut("/staff-category-assignments/" + encodeURIComponent(savedPersonId), { categoryId: form.staffCategory || null });
      } catch (categoryRequestError) {
        categoryError = categoryRequestError?.message || "The staff category assignment could not be saved.";
      }

      const currentAccount = accountsByPersonId[savedPersonId];
      try {
        if (currentAccount) {
          const desiredAccountEmail = roleAccountEmail(savedPersonId).toLowerCase();
          if (String(currentAccount.email || "").toLowerCase() !== desiredAccountEmail) {
            await apiPatch("/users/" + encodeURIComponent(currentAccount.id), { email: desiredAccountEmail });
          }
          if (currentAccount.role !== form.role) await apiPatch("/users/" + encodeURIComponent(currentAccount.id), { role: form.role });
          if (form.password) await apiPatch("/users/" + encodeURIComponent(currentAccount.id) + "/password", { newPassword: form.password });
        } else if (!editingPerson) {
          await createLoginAccount(savedPersonId, form.role);
        }
      } catch (accountRequestError) {
        accountError = accountRequestError?.message || "The profile saved, but its login account could not be updated.";
      }
      await refreshAll();
      setFormOpen(false);
      setEditingPerson(null);
      setForm(EMPTY_FORM);
      if (accountError || categoryError) {
        setError("Staff profile saved. " + [categoryError, accountError ? "Login account needs attention: " + accountError : ""].filter(Boolean).join(" "));
      } else {
        setFeedback(editingPerson ? fullName + " details updated successfully." : fullName + " has been added successfully.");
        notify?.(editingPerson ? fullName + " updated successfully." : fullName + " added successfully.");
      }
    } catch (requestError) {
      if (profileSaved) {
        await refreshAll();
        setFormOpen(false);
        setEditingPerson(null);
        setError("Staff profile saved, but an additional action failed: " + (requestError?.message || "Unknown error."));
      } else {
        setError(requestError?.message || "The staff details could not be saved. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAccountStatus(person, account) {
    const personId = String(person.id);
    setBusyPersonId(personId);
    clearNotices();
    const nextActive = !Boolean(account.isActive);
    try {
      await apiPatch("/users/" + encodeURIComponent(account.id), { isActive: nextActive });
      try {
        await apiPatch("/people/" + encodeURIComponent(personId), { status: nextActive ? "Active" : "Inactive" });
      } catch (statusError) {
        throw new Error("Login account updated, but staff status did not update: " + (statusError?.message || "Unknown error."));
      }
      setFeedback((person.fullName || "Staff member") + (nextActive ? " activated." : " deactivated."));
      await refreshAll();
      notify?.((person.fullName || "Staff member") + (nextActive ? " activated." : " deactivated."));
    } catch (requestError) {
      setError(requestError?.message || "The user ID status could not be changed.");
      await refreshAll();
    } finally {
      setBusyPersonId("");
      setStatusDialog(null);
    }
  }

  async function handleResetPassword(person, account) {
    clearNotices();
    if (!account?.id) {
      setError("There is no login account linked to this staff profile. Edit the profile and save a password to create one.");
      return;
    }
    setBusyPersonId(String(person.id));
    try {
      const result = await apiPost("/users/" + encodeURIComponent(account.id) + "/reset-password", {});
      setPasswordDialog({
        name: person.fullName || "Staff member",
        email: person.email || "",
        phone: person.contactNumber || "",
        password: result.temporaryPassword || "",
        message: result.message || "Share the temporary password securely."
      });
    } catch (requestError) {
      setError(requestError?.message || "Password could not be reset.");
    } finally {
      setBusyPersonId("");
    }
  }

  function downloadStaffContacts() {
    const rows = [
      CSV_FIELDS.map(([label]) => label),
      ...staff.map(person => {
        const account = accountsByPersonId[String(person.id)];
        return CSV_FIELDS.map(([, key]) => key === "staffCategory"
          ? (staffCategoryByPersonId[String(person.id)]?.categoryName || "")
          : getStaffExportValue(person, account, key));
      })
    ];
    const csv = "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\r\n");
    saveBlob("staff-contact-details.csv", new Blob([csv], { type: "text/csv;charset=utf-8" }));
    setFeedback("Staff contact details downloaded as a CSV file that opens in Excel.");
    notify?.("Staff contact details downloaded.");
  }
  async function downloadIdCard(person) {
    try {
      const blob = await createIdCardJpeg(person, cardSchoolName, schoolLogo);
      const name = String(person.fullName || "staff").trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "staff";
      saveBlob(name + "-id-card.jpg", blob);
      setFeedback("ID card downloaded as a JPEG image.");
    } catch (imageError) {
      setError(imageError?.message || "ID card image could not be downloaded.");
    }
  }
  async function copyTemporaryPassword() {
    if (!passwordDialog?.password) return;
    try {
      await navigator.clipboard.writeText(passwordDialog.password);
      setCopyMessage("Temporary password copied.");
    } catch {
      setCopyMessage("Select the password and copy it manually.");
    }
  }

  function renderField(definition) {
    const key = definition.key;
    const label = definition.label;
    const required = Boolean(definition.required) ||
      (key === "email" && form.loginMethod === "Email") ||
      (key === "password" && (!editingPerson || !accountsByPersonId[String(editingPerson.id)]));
    const type = definition.type || "text";
    const value = form[key] == null ? "" : form[key];
    let options = definition.options || [];
    if (key === "staffCategory") options = staffCategories
      .filter(category => category.isActive || category.id === value)
      .map(category => ({ value: category.id, label: category.name + (category.isActive ? "" : " (Inactive)") }));
    if (key === "staffBankName" || key === "schoolBankName") options = BANKS;
    return (
      <label key={key} className={"manage-staff-field" + (definition.span ? " span-" + definition.span : "")}>
        <span>{text(label)} {required && <span className="required">*</span>}</span>
        {type === "select" ? (
          <select required={required} value={value} onChange={event => updateForm(key, event.target.value)}>
            <option value="">{definition.placeholder || "Select " + label}</option>
            {options.map(option => {
              const item = typeof option === "string" ? { value: option, label: option } : option;
              return <option key={item.value} value={item.value}>{text(item.label)}</option>;
            })}
            {value && !options.some(option => (typeof option === "string" ? option : option.value) === value) &&
              <option value={value}>{value}</option>}
          </select>
        ) : (
          <input
            type={type}
            required={required}
            minLength={definition.minLength}
            maxLength={definition.maxLength || 200}
            min={definition.min}
            max={definition.max}
            autoComplete={definition.autoComplete || "off"}
            readOnly={Boolean(definition.readOnly && !editingPerson)}
            value={value}
            placeholder={definition.placeholder || ""}
            onChange={event => updateForm(key, event.target.value)}
          />
        )}
        {definition.help && <small className="manage-staff-field-help">{text(definition.help)}</small>}
      </label>
    );
  }

  const isEdit = Boolean(editingPerson);
  const shownName = selectedCard?.fullName || (selectedCard ? fullNameFromForm(staffDetailsOf(selectedCard)) : "");

  return (
    <section className="manage-staff-page">
      <button type="button" className="manage-staff-back" onClick={onBack}>
        <ArrowLeft size={15} /> {text("Back to Manage your Branch")}
      </button>

      {error && <div className="manage-staff-message" role="alert"><AlertCircle size={17} /><span>{text(error)}</span></div>}
      {feedback && !error && <div className="manage-staff-message success" role="status"><CheckCircle2 size={17} /><span>{text(feedback)}</span></div>}

      {!formOpen ? (
        <>
          <header className="manage-staff-heading manage-staff-list-heading">
            <div>
              <h2>{text("Manage Staff")}</h2>
              <p>{text("Add and update staff details, login access, ID cards, and contact records.")}</p>
              <div className="manage-staff-count-summary">{text("Total Staff")}: <strong>{staff.length}</strong> <span>·</span> {text("Active")}: <strong>{activeCount}</strong> <span>·</span> {text("Inactive")}: <strong>{inactiveCount}</strong></div>
            </div>
            <div className="manage-staff-heading-actions">
              <button type="button" className="manage-staff-secondary" onClick={() => setBulkUploadOpen(true)}><Upload size={15} /> {text("Bulk Upload")}</button>
              <button type="button" className="manage-staff-secondary" onClick={downloadStaffContacts}><Download size={15} /> {text("Download Contact Details")}</button>
              <button type="button" className="manage-staff-primary" onClick={openAddForm}><UserPlus size={16} /> {text("Add New")}</button>
            </div>
          </header>

          <section className="manage-staff-panel">
            <div className="manage-staff-panel-header">
              <div className="manage-staff-tabs" role="tablist" aria-label={text("Staff status")}>
                <button type="button" role="tab" aria-selected={activeTab === "Active"} className="manage-staff-tab" onClick={() => setActiveTab("Active")}>
                  {text("Active")} <span className="manage-staff-tab-count">{activeCount}</span>
                </button>
                <button type="button" role="tab" aria-selected={activeTab === "Inactive"} className="manage-staff-tab" onClick={() => setActiveTab("Inactive")}>
                  {text("Inactive")} <span className="manage-staff-tab-count">{inactiveCount}</span>
                </button>
              </div>
              <div className="manage-staff-tools">
                <label className="manage-staff-search">
                  <Search size={15} />
                  <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={text("Start typing to filter list...")} aria-label={text("Search staff")} />
                </label>
                <button type="button" className="manage-staff-refresh" onClick={() => void refreshAll()} aria-label={text("Refresh staff")} title={text("Refresh staff")} disabled={refreshing}>
                  <RefreshCw size={15} className={refreshing ? "manage-staff-spin" : ""} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="manage-staff-empty"><div className="manage-staff-empty-icon"><RefreshCw size={22} className="manage-staff-spin" /></div><strong>{text("Loading staff records")}</strong><p>{text("Retrieving current staff profiles from the school database.")}</p></div>
            ) : visibleStaff.length === 0 ? (
              <div className="manage-staff-empty">
                <div className="manage-staff-empty-icon">{activeTab === "Active" ? <UserCheck size={23} /> : <UserX size={23} />}</div>
                <strong>{text(search.trim() ? "No matching staff found" : "No " + activeTab.toLowerCase() + " staff")}</strong>
                <p>{text(search.trim() ? "Try another name, email address, designation, employee code, or phone number." : activeTab === "Active" ? "Use Add New to create the first staff profile." : "Staff marked inactive will appear here.")}</p>
                {!search.trim() && activeTab === "Active" && <button type="button" className="manage-staff-primary" onClick={openAddForm}><Plus size={15} /> {text("Add New")}</button>}
              </div>
            ) : (
              <div className="manage-staff-list">
                {visibleStaff.map(person => {
                  const account = accountsByPersonId[String(person.id)];
                  const details = staffDetailsOf(person);
                  const active = isPersonActive(person, account);
                  const busy = busyPersonId === String(person.id);
                  const photo = details.photoDataUrl;
                  return (
                    <article className="manage-staff-record" key={String(person.id)}>
                      <div className="manage-staff-record-avatar">
                        {photo ? <img src={photo} alt="" /> : <span>{initials(person.fullName)}</span>}
                      </div>
                      <div className="manage-staff-record-main">
                        <div className="manage-staff-record-name-row">
                          <div>
                            <h3>{person.fullName || text("Unnamed staff")}</h3>
                            <p>{text("Designation")}: <strong>{details.designation || (person.personType === "teacher" ? text("Teacher") : text("Staff"))}</strong></p>
                          </div>
                          <span className={"manage-staff-status " + (active ? "active" : "inactive")}>{text(active ? "Active" : "Inactive")}</span>
                        </div>
                        <div className="manage-staff-contact-lines">
                          {person.email && <span><Mail size={13} /> {person.email}</span>}
                          {person.contactNumber && <span><Phone size={13} /> {person.contactNumber}</span>}
                          {person.alternateContactNumber && <span><Phone size={13} /> {person.alternateContactNumber}</span>}
                          {person.externalId && <span><IdCard size={13} /> {text("Employee Code")}: {person.externalId}</span>}
                        </div>
                        <div className="manage-staff-account-caption">
                          <ShieldCheck size={13} />
                          {account ? text(account.isActive ? "Login account active" : "Login account inactive") : text("No login account linked")}
                          <span>·</span> {text("Last seen")}: {normalizeDateTime(person.lastSeen || account?.lastLoginAt)}
                        </div>
                      </div>
                      <div className="manage-staff-record-actions">
                        <button type="button" className="manage-staff-action" onClick={() => openEditForm(person)}><span aria-hidden="true">✎</span> {text("Edit")}</button>
                        <button type="button" className="manage-staff-action" onClick={() => void handleResetPassword(person, account)} disabled={busy || !account}><KeyRound size={13} /> {text("Reset Password")}</button>
                        <button type="button" className={"manage-staff-action " + (account?.isActive ? "deactivate" : "activate")} onClick={() => account && setStatusDialog({ person, account, nextActive: !account.isActive })} disabled={busy || !account} title={!account ? text("Edit this profile and save a password to create a login account.") : ""}>
                          {busy ? <RefreshCw size={13} className="manage-staff-spin" /> : account?.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                          {text(account?.isActive ? "Deactivate User Id" : "Activate User Id")}
                        </button>
                        <button type="button" className="manage-staff-action" onClick={() => setSelectedCard(person)}><IdCard size={13} /> {text("ID Card")}</button>
                        <button type="button" className="manage-staff-action" onClick={() => void downloadIdCard(person)}><FileImage size={13} /> {text("ID Card In JPEG Format")}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="manage-staff-form-screen" ref={formRef}>
          <header className="manage-staff-form-screen-heading">
            <div>
              <h2>{text(isEdit ? "Edit Staff Details" : "Add Staff Details")}</h2>
              <p>{text("Complete all applicable details below. Fields marked with * are required.")}</p>
            </div>
            <button type="button" className="manage-staff-secondary" onClick={closeForm}><X size={15} /> {text("Back to List")}</button>
          </header>
          <form className="manage-staff-form" onSubmit={handleSubmit}>
            <section className="manage-staff-form-section">
              <div className="manage-staff-section-heading"><div><h3>{text("Personal and Login Details")}</h3><p>{text("Identity, login method, contact numbers, and dates.")}</p></div></div>
              <div className="manage-staff-personal-layout">
                <div className="manage-staff-personal-fields">
                  <div className="manage-staff-name-grid">
                    {renderField({ key: "firstName", label: "First Name", required: true })}
                    {renderField({ key: "middleName", label: "Middle Name" })}
                    {renderField({ key: "lastName", label: "Last Name" })}
                  </div>
                  <div className="manage-staff-form-grid">
                    {renderField({ key: "designation", label: "Designation", required: true, span: 2, placeholder: "e.g. PGT - IP & AI" })}
                    {renderField({ key: "loginMethod", label: "Login Method", type: "select", options: [{ value: "Phone", label: "Phone" }, { value: "Email", label: "Email" }] })}
                    {renderField({ key: "email", label: "Email", type: "email", placeholder: "name@school.com", help: form.loginMethod === "Phone" ? "Optional for phone login." : "" })}
                    {!isEdit && renderField({ key: "password", label: "Password", type: "password", minLength: 10, placeholder: "At least 10 characters", help: "Used to create the staff login account." })}
                    {renderField({ key: "phone", label: "Phone", type: "tel", required: true, placeholder: "Enter phone number" })}
                    {renderField({ key: "alternatePhone", label: "Alternate Phone", type: "tel", placeholder: "Alternate contact number" })}
                    {renderField({ key: "dateOfBirth", label: "Date of Birth", type: "date" })}
                    {renderField({ key: "joiningDate", label: "Joining Date", type: "date", required: true })}
                    {renderField({ key: "anniversaryDate", label: "Anniversary Date", type: "date" })}
                    {renderField({ key: "bloodGroup", label: "Blood Group", type: "select", options: BLOOD_GROUPS, placeholder: "Select blood group" })}
                  </div>
                </div>
                <aside className="manage-staff-photo-panel">
                  <div className="manage-staff-photo-preview">
                    {form.photoDataUrl ? <img src={form.photoDataUrl} alt={text("Staff profile")} /> : <UserRound size={48} />}
                  </div>
                  <strong>{text("Profile Photo")}</strong>
                  <p>{text("Upload a staff photo for the profile and ID card.")}</p>
                  <input ref={photoInputRef} className="manage-staff-photo-input" type="file" accept="image/*" onChange={handlePhotoChange} />
                  <button type="button" className="manage-staff-secondary" onClick={() => photoInputRef.current?.click()}><Camera size={15} /> {text(form.photoDataUrl ? "Change Photo" : "Upload Photo")}</button>
                  {form.photoDataUrl && <button type="button" className="manage-staff-link-button" onClick={() => updateForm("photoDataUrl", "")}>{text("Remove Photo")}</button>}
                </aside>
              </div>
            </section>

            <section className="manage-staff-form-section">
              <div className="manage-staff-section-heading"><div><h3>{text("Address Details")}</h3><p>{text("Current address and location information.")}</p></div></div>
              <div className="manage-staff-form-grid">
                {renderField({ key: "address", label: "Address", span: 2, placeholder: "House, street, area" })}
                {renderField({ key: "city", label: "City" })}
                {renderField({ key: "state", label: "State" })}
                {renderField({ key: "zip", label: "ZIP / PIN Code", maxLength: 12 })}
                {renderField({ key: "country", label: "Country" })}
              </div>
            </section>

            <section className="manage-staff-form-section">
              <div className="manage-staff-section-heading"><div><h3>{text("Personal and Employment Information")}</h3><p>{text("Employee, demographic, and staff-role details.")}</p></div></div>
              <div className="manage-staff-form-grid">
                {renderField({ key: "employeeCode", label: "Employee Code", readOnly: true })}
                {renderField({ key: "gender", label: "Gender", type: "select", options: ["Not Specified", "Male", "Female", "Other"] })}
                {renderField({ key: "religion", label: "Religion" })}
                {renderField({ key: "nationality", label: "Nationality" })}
                {renderField({ key: "caste", label: "Caste" })}
                {renderField({ key: "category", label: "Category" })}
                {renderField({ key: "voterId", label: "Voter ID" })}
                {renderField({ key: "maritalStatus", label: "Marital Status", type: "select", options: ["Unmarried", "Married", "Widowed", "Divorced", "Separated"] })}
                {renderField({ key: "staffCategory", label: "Staff Category", type: "select", options: staffCategories, placeholder: "Select staff category" })}
                {renderField({ key: "role", label: "Role", type: "select", required: true, options: ROLE_OPTIONS })}
                {renderField({ key: "experience", label: "Experience (years)", type: "number", min: 0, max: 60, placeholder: "Experience in years" })}
                {renderField({ key: "fatherName", label: "Father Name" })}
                {renderField({ key: "husbandWifeName", label: "Husband/Wife Name" })}
                {renderField({ key: "employerEpfNumber", label: "Establishment with Employee EPF Number" })}
                {renderField({ key: "esiNumber", label: "ESI Number" })}
              </div>
            </section>

            <section className="manage-staff-form-section">
              <div className="manage-staff-section-heading"><div><h3>{text("Banking and Identity Details")}</h3><p>{text("Bank account, statutory, national ID, and biometric details.")}</p></div></div>
              <div className="manage-staff-form-grid">
                {renderField({ key: "staffBankName", label: "Staff Bank Name", type: "select", options: BANKS })}
                {renderField({ key: "schoolBankName", label: "School Bank Name", type: "select", options: BANKS })}
                {renderField({ key: "bankAccountNumber", label: "Bank Account Number" })}
                {renderField({ key: "ifscCode", label: "IFSC Code" })}
                {renderField({ key: "pfNumber", label: "PF Number" })}
                {renderField({ key: "aadharNumber", label: "Aadhaar Number", maxLength: 12 })}
                {renderField({ key: "panNumber", label: "PAN Number", maxLength: 10 })}
                <div className="manage-staff-field">
                  <span>{text("Biometric ID")}</span>
                  <div className="manage-staff-biometric-list">
                    {(Array.isArray(form.biometricIds) && form.biometricIds.length ? form.biometricIds : [""]).map((value, index) => (
                      <div className="manage-staff-biometric-row" key={index}>
                        <input aria-label={text("Biometric ID") + " " + (index + 1)} value={value} onChange={event => updateForm("biometricIds", form.biometricIds.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={text("Enter biometric ID")} />
                        {form.biometricIds.length > 1 && <button type="button" className="manage-staff-icon-button danger" onClick={() => updateForm("biometricIds", form.biometricIds.filter((_, itemIndex) => itemIndex !== index))} title={text("Remove biometric ID")} aria-label={text("Remove biometric ID")}><Trash2 size={14} /></button>}
                        {index === form.biometricIds.length - 1 && <button type="button" className="manage-staff-icon-button" onClick={() => updateForm("biometricIds", [...form.biometricIds, ""])} title={text("Add biometric ID")} aria-label={text("Add biometric ID")}><Plus size={16} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="manage-staff-form-section">
              <div className="manage-staff-section-heading"><div><h3>{text("Office Timings and Role Categories")}</h3><p>{text("Office hours and the work areas assigned to this staff account.")}</p></div></div>
              <div className="manage-staff-form-grid">
                {renderField({ key: "officeTimingsFrom", label: "Office Timings From", type: "time" })}
                {renderField({ key: "officeTimingsTo", label: "Office Timings To", type: "time" })}
                <fieldset className="manage-staff-role-categories span-2">
                  <legend>{text("Role Categories")}</legend>
                  <div className="manage-staff-role-category-list">
                    {ROLE_CATEGORIES.map(category => (
                      <label key={category}>
                        <input type="checkbox" checked={form.roleCategories.includes(category)} onChange={event => updateForm("roleCategories", event.target.checked ? [...form.roleCategories, category] : form.roleCategories.filter(item => item !== category))} />
                        <span>{text(category)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>

            <div className="manage-staff-form-footer">
              <button type="button" className="manage-staff-link-button" onClick={closeForm}>{text("Back to List")}</button>
              <div>
                <button type="button" className="manage-staff-secondary" onClick={closeForm} disabled={saving}><X size={15} /> {text("Cancel")}</button>
                <button type="submit" className="manage-staff-primary" disabled={saving}>
                  {saving ? <RefreshCw size={15} className="manage-staff-spin" /> : <Save size={15} />}
                  {text(saving ? "Saving..." : "Save")}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {passwordDialog && (
        <div className="manage-staff-modal-backdrop" role="presentation" onClick={() => { setPasswordDialog(null); setCopyMessage(""); }}>
          <section className="manage-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-password-title" onClick={event => event.stopPropagation()}>
            <div className="manage-staff-modal-heading"><div className="manage-staff-modal-icon"><KeyRound size={21} /></div><button type="button" className="manage-staff-icon-button" onClick={() => { setPasswordDialog(null); setCopyMessage(""); }} aria-label={text("Close")}><X size={17} /></button></div>
            <h3 id="staff-password-title">{text("Reset Password")}</h3>
            <p>{text("A temporary password was generated for")} <strong>{passwordDialog.name}</strong>. {text("Share it securely; the user must change it after signing in.")}</p>
            <label className="manage-staff-field"><span>{text("Temporary Password")}</span><input readOnly value={passwordDialog.password} onFocus={event => event.target.select()} /></label>
            {passwordDialog.email && <div className="manage-staff-modal-meta"><Mail size={14} /> {passwordDialog.email}</div>}
            {passwordDialog.phone && <div className="manage-staff-modal-meta"><Phone size={14} /> {passwordDialog.phone}</div>}
            {copyMessage && <p className="manage-staff-copy-message" role="status">{text(copyMessage)}</p>}
            <div className="manage-staff-modal-actions">
              <button type="button" className="manage-staff-secondary" onClick={() => { setPasswordDialog(null); setCopyMessage(""); }}>{text("Close")}</button>
              <button type="button" className="manage-staff-primary" onClick={() => void copyTemporaryPassword()}><Copy size={15} /> {text("Copy Password")}</button>
            </div>
          </section>
        </div>
      )}

      {statusDialog && (
        <div className="manage-staff-modal-backdrop" role="presentation" onClick={() => setStatusDialog(null)}>
          <section className="manage-staff-modal" role="dialog" aria-modal="true" aria-labelledby="staff-status-title" onClick={event => event.stopPropagation()}>
            <div className="manage-staff-modal-heading"><div className="manage-staff-modal-icon"><ShieldCheck size={21} /></div><button type="button" className="manage-staff-icon-button" onClick={() => setStatusDialog(null)} aria-label={text("Close")}><X size={17} /></button></div>
            <h3 id="staff-status-title">{text(statusDialog.nextActive ? "Activate User ID?" : "Deactivate User ID?")}</h3>
            <p>{text("This will")} <strong>{text(statusDialog.nextActive ? "restore login access for" : "disable login access for")}</strong> {statusDialog.person.fullName || text("this staff member")} {text("and move the profile to the matching tab.")}</p>
            <div className="manage-staff-modal-actions">
              <button type="button" className="manage-staff-secondary" onClick={() => setStatusDialog(null)}>{text("Cancel")}</button>
              <button type="button" className={"manage-staff-primary" + (statusDialog.nextActive ? "" : " danger")} onClick={() => void handleAccountStatus(statusDialog.person, statusDialog.account)}>{text(statusDialog.nextActive ? "Activate User Id" : "Deactivate User Id")}</button>
            </div>
          </section>
        </div>
      )}

      {selectedCard && (
        <div className="manage-staff-modal-backdrop" role="presentation" onClick={() => setSelectedCard(null)}>
          <section className="manage-staff-id-modal" role="dialog" aria-modal="true" aria-labelledby="staff-id-card-title" onClick={event => event.stopPropagation()}>
            <div className="manage-staff-modal-heading"><div><h3 id="staff-id-card-title">{text("Staff ID Card")}</h3><p>{text("Print this card or download it as a JPEG image.")}</p></div><button type="button" className="manage-staff-icon-button" onClick={() => setSelectedCard(null)} aria-label={text("Close")}><X size={17} /></button></div>
            <div className="manage-staff-id-card">
              <header className="manage-staff-id-card-header">
                {schoolLogo ? <img src={schoolLogo} alt="" /> : null}
                <div><strong>{cardSchoolName}</strong><span>{text("STAFF IDENTITY CARD")}</span></div>
              </header>
              <div className="manage-staff-id-card-body">
                <div className="manage-staff-id-card-photo">{staffDetailsOf(selectedCard).photoDataUrl ? <img src={staffDetailsOf(selectedCard).photoDataUrl} alt="" /> : <UserRound size={58} />}</div>
                <div className="manage-staff-id-card-details">
                  <h4>{shownName}</h4>
                  <p>{staffDetailsOf(selectedCard).designation || (selectedCard.personType === "teacher" ? "Teacher" : "Staff")}</p>
                  <dl>
                    <div><dt>{text("Employee Code")}</dt><dd>{selectedCard.externalId || staffDetailsOf(selectedCard).employeeCode || "—"}</dd></div>
                    <div><dt>{text("Date of Joining")}</dt><dd>{formatStaffDate(staffDetailsOf(selectedCard).joiningDate)}</dd></div>
                    <div><dt>{text("Phone")}</dt><dd>{selectedCard.contactNumber || "—"}</dd></div>
                    <div><dt>{text("Email")}</dt><dd>{selectedCard.email || "—"}</dd></div>
                    <div><dt>{text("Blood Group")}</dt><dd>{staffDetailsOf(selectedCard).bloodGroup || "—"}</dd></div>
                  </dl>
                </div>
              </div>
              <footer>{text("Keep this card available for school identification.")}</footer>
            </div>
            <div className="manage-staff-modal-actions">
              <button type="button" className="manage-staff-secondary" onClick={() => setSelectedCard(null)}>{text("Close")}</button>
              <button type="button" className="manage-staff-secondary" onClick={() => window.print()}><Printer size={15} /> {text("Print ID Card")}</button>
              <button type="button" className="manage-staff-primary" onClick={() => void downloadIdCard(selectedCard)}><FileImage size={15} /> {text("Download JPEG")}</button>
            </div>
          </section>
        </div>
      )}

      {bulkUploadOpen && (
        <ManageStaffBulkUpload
          existingStaff={staff}
          existingAccounts={Object.values(accountsByPersonId)}
          existingCategories={staffCategories}
          onClose={() => setBulkUploadOpen(false)}
          onComplete={async summary => {
            await refreshAll();
            setFeedback(summary);
            notify?.(summary);
          }}
        />
      )}
    </section>
  );
}
