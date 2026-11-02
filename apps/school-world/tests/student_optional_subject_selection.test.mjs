import test from "node:test";
import assert from "node:assert/strict";
import { mapOptionalSubjectRosterStudent, parseOptionalSubjectSelectionInput, selectionContainsOnlyAllowedSubjects } from "../server/studentOptionalSubjectSelection.js";
import { normalizeSelectedOptionalSubjectIds, persistentStudentDbId, studentOptionalSubjectContextKey, toggleOptionalSubjectSelection } from "../src/pages/Templates/PerformanceReport/optionalSubjectSelection.js";
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
const classId = "8a8a8a8a-1111-4111-8111-111111111111", mathId = "9b9b9b9b-2222-4222-8222-222222222222", compId = "7c7c7c7c-3333-4333-8333-333333333333";
test("validates class/year and de-duplicates valid IDs", () => {
 const r=parseOptionalSubjectSelectionInput({classId:" "+classId+" ",academicYear:" 2026-2027 ",subjectIds:[compId,compId,mathId]},uuid);
 assert.equal(r.ok,true);assert.deepEqual(r.value,{classId,academicYear:"2026-2027",subjectIds:[compId,mathId]});
});
test("rejects invalid class UUID",()=>assert.equal(parseOptionalSubjectSelectionInput({classId:"bad",academicYear:"2026-2027",subjectIds:[]},uuid).ok,false));
test("requires bounded academic year",()=>{assert.equal(parseOptionalSubjectSelectionInput({classId,academicYear:" ",subjectIds:[]},uuid).ok,false);assert.equal(parseOptionalSubjectSelectionInput({classId,academicYear:"x".repeat(33),subjectIds:[]},uuid).ok,false);});
test("rejects malformed subject IDs and oversized lists",()=>{assert.equal(parseOptionalSubjectSelectionInput({classId,academicYear:"2026-2027",subjectIds:["bad"]},uuid).ok,false);assert.equal(parseOptionalSubjectSelectionInput({classId,academicYear:"2026-2027",subjectIds:Array(41).fill(compId)},uuid).ok,false);});
test("allows empty selection for clearing existing choices",()=>assert.deepEqual(parseOptionalSubjectSelectionInput({classId,academicYear:"2026-2027",subjectIds:[]},uuid).value,{classId,academicYear:"2026-2027",subjectIds:[]}));
test("only permits the IDs supplied by active optional mappings",()=>{const allowed=new Set([compId]);assert.equal(selectionContainsOnlyAllowedSubjects([compId],allowed),true);assert.equal(selectionContainsOnlyAllowedSubjects([mathId],allowed),false);assert.equal(selectionContainsOnlyAllowedSubjects([],allowed),true);});
test("UI draft removes duplicate and disallowed choices",()=>assert.deepEqual(normalizeSelectedOptionalSubjectIds([compId,compId,mathId],[compId]),[compId]));
test("checkbox toggles add/remove optional and reject compulsory IDs",()=>{assert.deepEqual(toggleOptionalSubjectSelection([],compId,true,[compId]),[compId]);assert.deepEqual(toggleOptionalSubjectSelection([compId],compId,false,[compId]),[]);assert.deepEqual(toggleOptionalSubjectSelection([],mathId,true,[compId]),[]);});
test("cache key isolates class and year",()=>{assert.notEqual(studentOptionalSubjectContextKey(classId,"2025-2026"),studentOptionalSubjectContextKey(classId,"2026-2027"));assert.notEqual(studentOptionalSubjectContextKey(classId,"2026-2027"),studentOptionalSubjectContextKey(compId,"2026-2027"));});
test("separates the report roster key from the database UUID and restores persisted selections",()=>{
 const databaseStudentId="6d6d6d6d-4444-4444-8444-444444444444";
 const row=mapOptionalSubjectRosterStudent({id:"STU-104",studentId:"STU-104",name:"Aarav",rollNumber:"104",className:"Class 10",section:"A",academicYear:"2026-2027"},databaseStudentId,[mathId,mathId]);
 assert.equal(row.id,"STU-104");assert.equal(row.studentCode,"STU-104");assert.equal(row.studentDbId,databaseStudentId);
 assert.equal(persistentStudentDbId(row),databaseStudentId);assert.deepEqual(row.selectedSubjectIds,[mathId]);
});
