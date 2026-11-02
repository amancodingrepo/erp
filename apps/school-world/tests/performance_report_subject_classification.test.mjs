import test from "node:test";
import assert from "node:assert/strict";
import {findClassRecord,getClassSubjectClassification,getClassSubjectOptions,summarizeSubjectPerformance} from "../src/pages/Templates/PerformanceReport/subjectClassification.js";
const classes=[
 {id:"c10a",name:"Class 10",section:"A",displayName:"Class 10 A",status:"Active",subjectMappings:[
  {subjectId:"eng",subjectName:"English",enabled:true,optional:false},
  {subjectId:"math",subjectName:"Mathematics",enabled:true,optional:false},
  {subjectId:"comp",subjectName:"Computer Applications",enabled:true,optional:true},
  {subjectId:"inactive",subjectName:"Inactive Elective",enabled:true,optional:true}]},
 {id:"c9a",name:"Class 9",section:"A",displayName:"Class 9 A",status:"Active",subjectMappings:[{subjectId:"eng",subjectName:"English",enabled:true,optional:false}]}
];
const catalog=[
 {id:"eng",name:"English",status:"Active"},{id:"math",name:"Mathematics",status:"Active"},
 {id:"comp",name:"Computer Applications",status:"Active"},{id:"inactive",name:"Inactive Elective",status:"Inactive"},
 {id:"other",name:"Catalog Subject",status:"Active"}
];
test("matches normalized class names/display names",()=>{assert.equal(findClassRecord("class 10 a",classes)?.id,"c10a")});
test("reads existing optional class mapping",()=>{assert.equal(getClassSubjectClassification("Class 10 A","English",classes).type,"Primary / Compulsory");assert.equal(getClassSubjectClassification("Class 10 A","Computer Applications",classes).type,"Optional");assert.equal(getClassSubjectClassification("Class 10 A","Catalog Subject",classes).type,"Not mapped")});
test("class assessment subject list uses saved class mappings and excludes inactive subjects",()=>{const options=getClassSubjectOptions("Class 10 A",catalog,classes);assert.deepEqual(options.map(x=>x.name),["English","Mathematics","Computer Applications"]);assert.equal(options[2].optional,true)});
test("legacy catalog fallback stays unclassified without class mapping",()=>{assert.ok(getClassSubjectOptions("Class 11",catalog,classes).some(x=>x.name==="Catalog Subject"&&!x.mapped))});
test("ambiguous sections are not silently guessed when subject rules differ",()=>{const sections=[{name:"Class 10",section:"A",subjectMappings:[{subjectName:"English",enabled:true,optional:false}]},{name:"Class 10",section:"B",subjectMappings:[{subjectName:"English",enabled:true,optional:true}]}];assert.equal(findClassRecord("Class 10",sections),null);assert.equal(getClassSubjectClassification("Class 10","English",sections).type,"Not mapped")});
test("report aggregates primary, optional and unmapped results separately",()=>{const exams={e1:{id:"e1",className:"Class 10 A",subjectName:"English",maxMarks:100},e2:{id:"e2",className:"Class 10 A",subjectName:"Computer Applications",maxMarks:50},e3:{id:"e3",className:"Class 10 A",subjectName:"Legacy custom subject",maxMarks:25}};const x=summarizeSubjectPerformance([{examId:"e1",marksObtained:80},{examId:"e2",marksObtained:40},{examId:"e3",marksObtained:20}],exams,classes);assert.equal(x.primary.percentage,80);assert.equal(x.optional.percentage,80);assert.equal(x.unmapped.percentage,80);assert.equal(x.primary.maximum,100);assert.equal(x.optional.maximum,50)});
