# MPOnline Demo ERP — full AJAX crawl

Crawled **340/340** admin sidebar pages with authenticated GETs.
Extracted inline AJAX / DataTables / form-action URLs from each page HTML.
This is still not OpenAPI: there is no /api prefix. Endpoints are CodeIgniter /{controller}/{method}.

## Crawl result

| Metric | Count |
|---|---|
| Pages crawled | 340 |
| HTTP 200 | 337 |
| HTTP 401 | 1 |
| HTTP 404 | 2 |
| Unique AJAX/form endpoints (page-specific) | 1012 |
| Page→endpoint pairs | 3929 |

Skipped on purpose: /site/logout, /admin/admin/backup.
Global chrome endpoints (calendar, currency, branch switch, header search) were stripped from the per-page lists; they appear on almost every page.

## Non-200 pages

| Status | Path |
|---|---|
| 401 | `/admin/multibranch/branch` |
| 404 | `/homework/dailyassignment` |
| 404 | `/homework/homeworkordailyassignmentreport` |

## Unique endpoints by controller

### `/.` (1)

- `/./uploads/staff_images/`

### `/action_page.php` (1)

- `/action_page.php`

### `/addrequest` (1)

- `/addrequest`

### `/admin` (809)

- `/admin/admin/addfiletype`
- `/admin/admin/changepass`
- `/admin/admin/filetype`
- `/admin/admission/admission_dashboard`
- `/admin/admission/generatePdf`
- `/admin/admission/importapplication`
- `/admin/admission/report`
- `/admin/admission/save_fees_off_reason`
- `/admin/admission/selection_status_report`
- `/admin/admission_transfer_cancellation/approve_event`
- `/admin/admission_transfer_cancellation/event_reject`
- `/admin/admission_transfer_cancellation/fetch_role_staff`
- `/admin/admission_transfer_cancellation/request_approve_reject`
- `/admin/admission_transfer_cancellation/request_event_details`
- `/admin/admission_transfer_cancellation/track_request`
- `/admin/admitcard`
- `/admin/admitcard/view`
- `/admin/alumni/add`
- `/admin/alumni/add_event`
- `/admin/alumni/alumnilist`
- `/admin/alumni/delete_event/`
- `/admin/alumni/deletestudent/`
- `/admin/alumni/get_alumnidetails`
- `/admin/alumni/get_event/`
- `/admin/alumni/getevent`
- `/admin/approve_leave`
- `/admin/approve_leave/add`
- `/admin/approve_leave/get_details`
- `/admin/approve_leave/remove_leave`
- `/admin/approve_leave/searchByClassSection/`
- `/admin/approve_leave/status`
- `/admin/assign_mentor`
- `/admin/assign_mentor/generate_pdf`
- `/admin/assign_mentor/getStudentByStaff`
- `/admin/assign_mentor/ojt_approval_list`
- `/admin/assign_mentor/save_mentor_data`
- `/admin/assign_mentor/student_lists`
- `/admin/assign_mentor/update_ojt_request/`
- `/admin/assign_mentor/update_project_request/`
- `/admin/assign_mentor/update_sip_request/`
- `/admin/assign_variable_fees`
- `/admin/assign_variable_fees/addfeegroupClasswise`
- `/admin/atkt_form/addProgram`
- `/admin/atkt_form/admissionsetting`
- `/admin/atkt_form/atkt_form_report`
- `/admin/atkt_form/changeformfieldsetting`
- `/admin/atkt_form/checkpaymentstatus`
- `/admin/atkt_form/delete_selected_students`
- `/admin/atkt_form/delete_selected_subjects`
- `/admin/atkt_form/delete_student_subject`
- `/admin/atkt_form/edit_atkt_form_student`
- `/admin/atkt_form/get_current_class_marks`
- `/admin/atkt_form/getProgram`
- `/admin/atkt_form/getstudentlist`
- `/admin/atkt_form/importAtktFile`
- `/admin/atkt_form/partly_payment_modal`
- `/admin/atkt_form/update_result_generate_status`
- `/admin/atkt_form/update_student_marks`
- `/admin/attributes/create`
- `/admin/audit/delete/`
- `/admin/audit/getDatatable`
- `/admin/batch_settings`
- `/admin/book/getbooklist`
- `/admin/calendar/addtodo`
- `/admin/calendar/delete_event/`
- `/admin/calendar/getevents`
- `/admin/calendar/gettaskbyid/`
- `/admin/calendar/shift_event`
- `/admin/calendar/view_event/`
- `/admin/canteen/all_events`
- `/admin/canteen/canteen_auditor`
- `/admin/canteen/create_coupon`
- `/admin/canteen/delete_data/break_type`
- `/admin/canteen/delete_data/canteen`
- `/admin/canteen/delete_data/canteen_coupon`
- `/admin/canteen/delete_data/canteen_foodrating`
- `/admin/canteen/delete_data/food_item`
- `/admin/canteen/foodItem_menuwise`
- `/admin/canteen/foodItemId?date=`
- `/admin/canteen/get_breaktype_list`
- `/admin/canteen/get_events`
- `/admin/canteen/get_foodItem_list`
- `/admin/canteen/getcanteenlist`
- `/admin/canteen/getFoodItem/1`
- `/admin/canteen/getFoodItem/2`
- `/admin/canteen/getFoodItem/3`
- `/admin/canteen/getFoodItem/4`
- `/admin/canteen/getFoodItem/5`
- `/admin/canteen/getFoodItem/6`
- `/admin/canteen/getFoodItem/7`
- `/admin/canteen/getFoodItem/8`
- `/admin/canteen/getFoodItem/9`
- `/admin/canteen/insert_data`
- `/admin/canteen/update_status/break_type`
- `/admin/canteen/update_status/canteen`
- `/admin/canteen/update_status/food_item`
- `/admin/captcha/changeStatus`
- `/admin/certificate/create`
- `/admin/certificate/createCustomFieldsForCertificate`
- `/admin/certificate/view`
- `/admin/Certificate_report/search`
- `/admin/chat/adduser`
- `/admin/chat/chatUpdate`
- `/admin/chat/getChatRecord`
- `/admin/chat/mychatnotification`
- `/admin/chat/mynewuser`
- `/admin/chat/myuser`
- `/admin/chat/newMessage`
- `/admin/chat/searchuser`
- `/admin/classroom/classroom_allotment`
- `/admin/classroom/classroomsetupsave`
- `/admin/classroom/deleteClassroomAllotment`
- `/admin/complaint`
- `/admin/complaint/details/`
- `/admin/complaint/edit/`
- `/admin/conference`
- `/admin/conference/add_history`
- `/admin/conference/addByOther`
- `/admin/conference/addcredential`
- `/admin/conference/addMeeting`
- `/admin/conference/chkstatus`
- `/admin/conference/class_report`
- `/admin/conference/getlivestatus`
- `/admin/conference/getViewerList`
- `/admin/conference/staffCredential`
- `/admin/content/ajaxupdate`
- `/admin/content/ajaxupload`
- `/admin/content/delete`
- `/admin/content/delete_array`
- `/admin/content/download_content/`
- `/admin/content/generate_url`
- `/admin/content/getsharedcontents`
- `/admin/content/getsharelist`
- `/admin/content/getuploaddata`
- `/admin/content/share`
- `/admin/contenttype`
- `/admin/contenttype/getcontenttypelist`
- `/admin/copo/add_info`
- `/admin/copo/addBook`
- `/admin/copo/addCourseObjective`
- `/admin/copo/addGapsIdentified`
- `/admin/copo/addIndustrialSector`
- `/admin/copo/addInnovativePedagogyAdopted`
- `/admin/copo/addJobProfiles`
- `/admin/copo/addOtherActivity`
- `/admin/copo/addSkillSet`
- `/admin/copo/approveandnext`
- `/admin/copo/approveplan`
- `/admin/copo/co_po_mapping`
- `/admin/copo/completeAndSend`
- `/admin/copo/course_outcomes`
- `/admin/copo/deleteElement`
- `/admin/copo/forwordMessage`
- `/admin/copo/getBook`
- `/admin/copo/getCourseInfo`
- `/admin/copo/getCourseObjective`
- `/admin/copo/getCourseOutcomes`
- `/admin/copo/getGapsIdentified`
- `/admin/copo/getIndustrialSector`
- `/admin/copo/getInnovativePedagogyAdopted`
- `/admin/copo/getJobProfile`
- `/admin/copo/getLessonCourseOutcomes`
- `/admin/copo/getLessonDetails`
- `/admin/copo/getOtherActivity`
- `/admin/copo/getProgramOutcomes`
- `/admin/copo/getSkillSet`
- `/admin/copo/getsubjectByExamgroup`
- `/admin/copo/getTabInfo/`
- `/admin/copo/indirect_po_mapping`
- `/admin/copo/lesson`
- `/admin/copo/loadLessonContent`
- `/admin/copo/plan`
- `/admin/copo/print_indirect_program_outcomes`
- `/admin/copo/print_program_outcomes`
- `/admin/copo/printSubjectPlan`
- `/admin/copo/rejectplan`
- `/admin/copo/save_indirect_po_mappings`
- `/admin/copo/saveCoPoMappings`
- `/admin/copo/trackApprovalLog`
- `/admin/copo/updateCourseOutcomes`
- `/admin/copo/updateLesson`
- `/admin/copo/updateProgramOutcomes`
- `/admin/currency/changeactive`
- `/admin/currency/changestatus`
- `/admin/currency/editprice`
- `/admin/currency/editsymbol`
- `/admin/currency/getAmountFormat`
- `/admin/customfield`
- `/admin/customfield/get_custom_field_value`
- `/admin/customfield/updateorder`
- `/admin/dashboard`
- `/admin/department/department`
- `/admin/designation/designation`
- `/admin/disable_reason`
- `/admin/dispatch`
- `/admin/dispatch/details/`
- `/admin/enquiry`
- `/admin/enquiry/add/`
- `/admin/enquiry/check_number`
- `/admin/enquiry/delete/`
- `/admin/enquiry/details/`
- `/admin/enquiry/editpost/`
- `/admin/enquiry/follow_up/`
- `/admin/enquiry/follow_up_list/`
- `/admin/exam_schedule`
- `/admin/exam_schedule/getClassAndDepartment`
- `/admin/examgroup`
- `/admin/examgroup/addfeegrp`
- `/admin/examgroup/addrevaluationfeegrp`
- `/admin/examgroup/checkEntries`
- `/admin/examgroup/copy_subject_co_fromoldtocurrent_session`
- `/admin/examgroup/create_remuneration`
- `/admin/examgroup/delete_exam_form`
- `/admin/examgroup/delete_revaluation_form`
- `/admin/examgroup/displaymarksexamsubjwise`
- `/admin/examgroup/exam_form`
- `/admin/examgroup/exam_type`
- `/admin/examgroup/generate_exam_form_pdf`
- `/admin/examgroup/generate_revaluation_exam_form_pdf`
- `/admin/examgroup/get_rate_by_marks`
- `/admin/examgroup/get_vertix_by_subject`
- `/admin/examgroup/getByClassAndSemester`
- `/admin/examgroup/getClassByExamAndExamGroup`
- `/admin/examgroup/getClassByExamgroup`
- `/admin/examgroup/getcollectfee`
- `/admin/examgroup/getExamByExamgroup`
- `/admin/examgroup/getExamByExamGroupClassSection`
- `/admin/examgroup/getExamByExamGroupCurrentSession`
- `/admin/examgroup/getExamSubject`
- `/admin/examgroup/getHoursBySupervision`
- `/admin/examgroup/getRateBySupervisionAndHours`
- `/admin/examgroup/getsubjectByExamgroup`
- `/admin/examgroup/markEntrySingleSubject`
- `/admin/examgroup/markentrysubjectwise`
- `/admin/examgroup/print_remuneration/`
- `/admin/examgroup/remuneration_hoursetup`
- `/admin/examgroup/remuneration_setup`
- `/admin/examgroup/revaluation_form`
- `/admin/examgroup/sgpi_student_list`
- `/admin/examgroup/subject_marks_exportformat`
- `/admin/examgroup/subjectwise_uploadfile`
- `/admin/examgroup/uploadfile`
- `/admin/examgroup/uploadfilecsv`
- `/admin/examgroup/uploadfileSpgi`
- `/admin/examgroup/uploadLegacyResults`
- `/admin/exammarksheet/marksheet`
- `/admin/exammarksheet/print_certificate`
- `/admin/exammarksheet/shareMarksheet`
- `/admin/exammarksheet/view`
- `/admin/exammarksheet/viewmarksheet`
- `/admin/examresult`
- `/admin/examresult/admitcard`
- `/admin/examresult/exam_result_block_unblock`
- `/admin/examresult/marksheet`
- `/admin/examresult/pdftmarksheet`
- `/admin/examresult/print_certificate`
- `/admin/examresult/save_exam_result_block_unblock`
- `/admin/examresult/shareMarksheet`
- `/admin/examresult/sharePrintCard`
- `/admin/examresult/viewmarksheet`
- `/admin/expense`
- `/admin/expense/getexpenselist`
- `/admin/expense/getsearchexpenselist`
- `/admin/expense/search`
- `/admin/expensehead/ajaxSearch`
- `/admin/expensehead/create`
- `/admin/fee_receipt_import/upload`
- `/admin/feediscount`
- `/admin/feegroup`
- `/admin/feemaster`
- `/admin/feemaster/getSpecialization`
- `/admin/feemastercoursewise/getclasssectionwisesubjects`
- `/admin/feemastercoursewise/getFeeDetails`
- `/admin/feemastercoursewise/getSpecializationByClassSections`
- `/admin/feemastercoursewise/save`
- `/admin/feereminder/setting`
- `/admin/fees_installment`
- `/admin/fees_type_group`
- `/admin/feesforward/index`
- `/admin/feetype`
- `/admin/fine_rules/create`
- `/admin/flowmaster/approve_event`
- `/admin/flowmaster/assign_participant_event_details`
- `/admin/flowmaster/assigned_participant_event_details`
- `/admin/flowmaster/create`
- `/admin/flowmaster/delete_data`
- `/admin/flowmaster/delete_event`
- `/admin/flowmaster/delete_staff`
- `/admin/flowmaster/event_reject`
- `/admin/flowmaster/get_current_event`
- `/admin/flowmaster/manageEventParticipants/`
- `/admin/flowmaster/print_edetail_sign`
- `/admin/flowmaster/print_edetail_stdReport`
- `/admin/flowmaster/printParticipants/`
- `/admin/flowmaster/report_event_details`
- `/admin/flowmaster/show_activity_images`
- `/admin/flowmaster/show_postevent`
- `/admin/flowmaster/singledelete_activity/`
- `/admin/flowmaster/singledelete_activity_image/`
- `/admin/flowmaster/track_event`
- `/admin/flowmaster/update_event_participant`
- `/admin/flowmaster/upload_invoice`
- `/admin/flowmaster/upload_postevent`
- `/admin/flowmaster/view_event_details`
- `/admin/front/banner/add`
- `/admin/front/banner/remove`
- `/admin/front/media/addVideo`
- `/admin/front/media/deleteItem`
- `/admin/front/media/getMedia`
- `/admin/front/media/getPage/`
- `/admin/front/menus`
- `/admin/frontcms`
- `/admin/generalcall`
- `/admin/generalcall/details/`
- `/admin/generalcall/getcalllist`
- `/admin/generatecertificate/generatemultiple`
- `/admin/generatecertificate/getCertificateCustomFields`
- `/admin/generatecertificate/search`
- `/admin/generateidcard/downloadstdimagesfolderzip`
- `/admin/generateidcard/generatemultiple`
- `/admin/generateidcard/search`
- `/admin/generatestaffidcard/downloadstdimagesfolderzip`
- `/admin/generatestaffidcard/generatemultiple`
- `/admin/generatestaffidcard/search`
- `/admin/gmeet`
- `/admin/gmeet/add_history`
- `/admin/gmeet/addByOther`
- `/admin/gmeet/addMeeting`
- `/admin/gmeet/chgstatus`
- `/admin/gmeet/class_report`
- `/admin/gmeet/getMeetingStaff`
- `/admin/gmeet/getViewerList`
- `/admin/grade`
- `/admin/grade/relative_Grade`
- `/admin/holiday/deleteWeeklyOff`
- `/admin/holiday/getHolidaysByMonthYear`
- `/admin/holiday/getStaffWeeklyOff`
- `/admin/holiday/getWeeklyOffByMonthYear`
- `/admin/holiday/saveStaffWeeklyOff`
- `/admin/holiday/saveWeeklyOff`
- `/admin/holiday/search_set_working_days`
- `/admin/holiday/staff_week_off`
- `/admin/hostel/create`
- `/admin/hostel/fetchgatepass_request`
- `/admin/hostel/fetchgatepassticket_details`
- `/admin/hostel/get_allocated_student`
- `/admin/hostel/get_room_charges`
- `/admin/hostel/get_rooms_bed`
- `/admin/hostel/getAllStudentList/`
- `/admin/hostel/getRoom_student_list/`
- `/admin/hostel/getStudentList/`
- `/admin/hostel/hostel_rooms`
- `/admin/hostel/hostel_rooms_for_change`
- `/admin/hostel/insert_assign_room`
- `/admin/hostel/insert_change_room`
- `/admin/hostel/scan_qrcode`
- `/admin/hostel/update_gatepass`
- `/admin/hostel/update_gatepass_status`
- `/admin/hostel/vaaccant_room`
- `/admin/hostel/vacancy_status`
- `/admin/hostelroom/create`
- `/admin/hostelroom/dthostellist`
- `/admin/hostelroom/getRoom`
- `/admin/hostelroom/searchvalidation`
- `/admin/income`
- `/admin/income/checkvalidation`
- `/admin/income/getincomelist`
- `/admin/income/getincomesearchlist`
- `/admin/incomehead/create`
- `/admin/inward/acknowledge_by_staff`
- `/admin/inward/add_inward`
- `/admin/inward/ajax_approve`
- `/admin/inward/delete_inward`
- `/admin/inward/delete_member`
- `/admin/inward/edit_inward`
- `/admin/inward/edit_inward_modal`
- `/admin/inward/fetch_dept_staff`
- `/admin/inward/fetch_role_staff`
- `/admin/inward/inward_approve_reject`
- `/admin/inward/principal_approve_reject`
- `/admin/inward/principal_inward_approve`
- `/admin/inward/principal_inward_reject`
- `/admin/inward/send_approval`
- `/admin/inward/send_approval_to_staff_by_registrar`
- `/admin/inward/staff_action`
- `/admin/inward/staff_approval`
- `/admin/inward/track_inward`
- `/admin/inward/view_inward_details`
- `/admin/inward/view_staff_acknowledge`
- `/admin/issueitem/getitemlist`
- `/admin/issueitem/returnItem`
- `/admin/item`
- `/admin/itemcategory/create`
- `/admin/itemstock`
- `/admin/itemstock/getItemByCategory`
- `/admin/itemstock/getItemunit`
- `/admin/itemstore/create`
- `/admin/itemsupplier/create`
- `/admin/language/defoult_language/`
- `/admin/language/editcountrycode`
- `/admin/language/onloadlanguage`
- `/admin/language/rtl`
- `/admin/language/select_language/`
- `/admin/language/unselect_language/`
- `/admin/language/user_language/`
- `/admin/leave_batch_years`
- `/admin/leaverequest/add_staff_leave`
- `/admin/leaverequest/addLeave`
- `/admin/leaverequest/bulkLeaveApprove`
- `/admin/leaverequest/cancel_staff_leave`
- `/admin/leaverequest/countLeave/`
- `/admin/leaverequest/downloadleaverequestdoc/`
- `/admin/leaverequest/getCombinationLeaveCount`
- `/admin/leaverequest/getCombinedLeaveDetails`
- `/admin/leaverequest/getStaffCombinationLeaves`
- `/admin/leaverequest/leaveRecord`
- `/admin/leaverequest/leaverequest/`
- `/admin/leaverequest/leaveStatus`
- `/admin/leaverequest/remove/`
- `/admin/leaverequest/save_cancel_request`
- `/admin/leavetypes/createleavetype`
- `/admin/lessonplan/changeTopicStatus`
- `/admin/lessonplan/copylesson`
- `/admin/lessonplan/createinstruction_plan`
- `/admin/lessonplan/createlesson`
- `/admin/lessonplan/createtopic`
- `/admin/lessonplan/deleteinstruction_planbulk/`
- `/admin/lessonplan/deletelessonbulk/`
- `/admin/lessonplan/get_`
- `/admin/lessonplan/getClasswiseBatchData`
- `/admin/lessonplan/getinstruction_planlist`
- `/admin/lessonplan/getlessonBysubjectid/`
- `/admin/lessonplan/getlessonBysubjectidedit/`
- `/admin/lessonplan/getlessonlist`
- `/admin/lessonplan/gettopicBylessonid/`
- `/admin/lessonplan/gettopiclist`
- `/admin/lessonplan/topic_completedate`
- `/admin/liberal_art/admissionsetting`
- `/admin/liberal_art/changeformfieldsetting`
- `/admin/liberal_art/checkpaymentstatus`
- `/admin/liberal_art/getstudentlist`
- `/admin/liberal_art/insert_partly_payment`
- `/admin/liberal_art/liberal_art_report`
- `/admin/liberal_art/partly_payment_modal`
- `/admin/mailsms/add_email_template`
- `/admin/mailsms/add_sms_template`
- `/admin/mailsms/delete_schedule`
- `/admin/mailsms/edit_email_template`
- `/admin/mailsms/edit_sms_template`
- `/admin/mailsms/get_birthday_preview`
- `/admin/mailsms/get_class_preview`
- `/admin/mailsms/get_individual_preview`
- `/admin/mailsms/get_preview`
- `/admin/mailsms/search`
- `/admin/mailsms/send_birthday`
- `/admin/mailsms/send_birthday_sms`
- `/admin/mailsms/send_class`
- `/admin/mailsms/send_class_sms`
- `/admin/mailsms/send_group`
- `/admin/mailsms/send_group_sms`
- `/admin/mailsms/send_individual`
- `/admin/mailsms/send_individual_sms`
- `/admin/mailsms/smstemplatedata`
- `/admin/mailsms/templatedata`
- `/admin/mailsms/test_sms`
- `/admin/mailsms/update_email_template`
- `/admin/mailsms/update_sms_template`
- `/admin/marksdivision`
- `/admin/marksheet`
- `/admin/marksheet/view`
- `/admin/member/add`
- `/admin/member/addteacher`
- `/admin/member/student`
- `/admin/member/surrender`
- `/admin/module/changeStatus`
- `/admin/module/changeStudentStatus`
- `/admin/naac/all_events`
- `/admin/naac/allote_task`
- `/admin/naac/aqar_part_B_pdf`
- `/admin/naac/delete_data/naac_student_feedback`
- `/admin/naac/delete_data/naac_student_rating`
- `/admin/naac/delete_data/naac_task_master`
- `/admin/naac/get_task_detail_by_id`
- `/admin/naac/naac_report`
- `/admin/naac/naac_report_gettasklist`
- `/admin/naac/student_rating_form`
- `/admin/naac/update_status/naac_student_feedback`
- `/admin/notification/gettemplate`
- `/admin/notification/notification`
- `/admin/notification/notification_clear`
- `/admin/notification/notification_read`
- `/admin/notification/read`
- `/admin/notification/savetemplate`
- `/admin/notification/setting`
- `/admin/offlinepayment/getlist`
- `/admin/offlinepayment/getpayment`
- `/admin/onlineadmission/add_section`
- `/admin/onlineadmission/addAdmissionValidation`
- `/admin/onlineadmission/addProgram`
- `/admin/onlineadmission/addValidation`
- `/admin/onlineadmission/admission_add_section`
- `/admin/onlineadmission/admissionsetting`
- `/admin/onlineadmission/changeadmissionformfieldsetting`
- `/admin/onlineadmission/changefinalizedformfieldsetting`
- `/admin/onlineadmission/changeformfieldsetting`
- `/admin/onlineadmission/changeformfieldsetting_2year`
- `/admin/onlineadmission/changeformfieldsetting_3year`
- `/admin/onlineadmission/delete_admission_section`
- `/admin/onlineadmission/delete_section`
- `/admin/onlineadmission/deleteProgram`
- `/admin/onlineadmission/getProgram`
- `/admin/onlineadmission/getSpecializationByProgram`
- `/admin/onlineadmission/global_apply_program`
- `/admin/onlineadmission/global_apply_program_admission`
- `/admin/onlineadmission/global_apply_year`
- `/admin/onlineadmission/global_apply_year_admission`
- `/admin/onlineadmission/save_admission_field_data`
- `/admin/Onlineadmission/save_admission_field_settings`
- `/admin/onlineadmission/save_admission_field_type`
- `/admin/onlineadmission/save_admission_order`
- `/admin/Onlineadmission/save_field_settings`
- `/admin/onlineadmission/save_field_type`
- `/admin/onlineadmission/save_order`
- `/admin/onlineadmission/save_row_data`
- `/admin/onlineadmission/update_admission_display_in_previous_section`
- `/admin/onlineadmission/update_admission_section`
- `/admin/onlineadmission/update_display_in_previous_section`
- `/admin/onlineadmission/update_section`
- `/admin/onlineexam/add`
- `/admin/onlineexam/ajax_delete`
- `/admin/onlineexam/deleteExamQuestions`
- `/admin/onlineexam/download_exam`
- `/admin/onlineexam/dtreportlist`
- `/admin/onlineexam/getclosedexamlist`
- `/admin/onlineexam/getexamlist`
- `/admin/onlineexam/getExamQuestions`
- `/admin/onlineexam/getOnlineExamByID`
- `/admin/onlineexam/getselectedexamsubjectname`
- `/admin/onlineexam/getstudentresult`
- `/admin/onlineexam/rankgenerate`
- `/admin/onlineexam/searchloginvalidation`
- `/admin/onlineexam/searchQuestionByExamID`
- `/admin/onlineexam/singlequestionAddupdate`
- `/admin/onlinestudent/checkpaymentstatus`
- `/admin/onlinestudent/getstudentlist`
- `/admin/others_fees_verification/index`
- `/admin/outward/add_inward_outward`
- `/admin/outward/add_inwardoutward`
- `/admin/outward/add_outward`
- `/admin/outward/add_outward_document`
- `/admin/outward/delete_member`
- `/admin/outward/delete_outward`
- `/admin/outward/edit_inward_outward`
- `/admin/outward/edit_outward`
- `/admin/outward/edit_outward_modal`
- `/admin/outward/fetch_dept_staff`
- `/admin/outward/print_inoutwarddetail`
- `/admin/outward/print_outwarddetail`
- `/admin/outward/upload_document`
- `/admin/outward/view_inoutwarddetail`
- `/admin/outward/view_outwarddetail`
- `/admin/paper_creation`
- `/admin/paper_creation/addSubjectwiseQuestionPaper`
- `/admin/paper_creation/assign_paper_creation`
- `/admin/paper_creation/editSubjectwiseQuestionPaper`
- `/admin/paper_creation/generatePdfSubjectwiseQuestionPaper`
- `/admin/paper_creation/getassignStaff`
- `/admin/paper_creation/getQuestionPaperReviewerStaffList`
- `/admin/paper_creation/save_assign_staff`
- `/admin/paper_creation/saveQuestionPaperReviewStaff`
- `/admin/paper_creation/submit_questions`
- `/admin/paper_creation/update_approval_status`
- `/admin/paper_creation/update_paper_request`
- `/admin/papersetting/add`
- `/admin/papersetting/addform`
- `/admin/papersetting/bulkdelete`
- `/admin/papersetting/editform`
- `/admin/papersetting/getDatatable`
- `/admin/papersetting/getimages`
- `/admin/papersetting/getinactiveDatatable`
- `/admin/papersetting/getsubjectByselectedClass`
- `/admin/papersetting/getSubjectsBysubjectgroupid`
- `/admin/papersetting/questionsearchvalidation`
- `/admin/papersetting/uploadfile`
- `/admin/paymentcategory`
- `/admin/paymentcategory/assignPaymentCategory`
- `/admin/paymentcategory/collegeotherfees`
- `/admin/paymentcategory/multimerchant`
- `/admin/paymentsettings/billdesk`
- `/admin/paymentsettings/billplz`
- `/admin/paymentsettings/cashfree`
- `/admin/paymentsettings/ccavenue`
- `/admin/paymentsettings/easebuzz`
- `/admin/paymentsettings/flutterwave`
- `/admin/paymentsettings/instamojo`
- `/admin/paymentsettings/ipayafrica`
- `/admin/paymentsettings/jazzcash`
- `/admin/paymentsettings/midtrans`
- `/admin/paymentsettings/mollie`
- `/admin/paymentsettings/mponline`
- `/admin/paymentsettings/onepay`
- `/admin/paymentsettings/payfast`
- `/admin/paymentsettings/payhere`
- `/admin/paymentsettings/paypal`
- `/admin/paymentsettings/paystack`
- `/admin/paymentsettings/paytm`
- `/admin/paymentsettings/payu`
- `/admin/paymentsettings/pesapal`
- `/admin/paymentsettings/razorpay`
- `/admin/paymentsettings/setting`
- `/admin/paymentsettings/skrill`
- `/admin/paymentsettings/sslcommerz`
- `/admin/paymentsettings/stripe`
- `/admin/paymentsettings/toyyibPay`
- `/admin/paymentsettings/twocheckout`
- `/admin/paymentsettings/walkingm`
- `/admin/payroll`
- `/admin/payroll/create`
- `/admin/payroll/paymentRecord`
- `/admin/payroll/paymentSuccess`
- `/admin/payroll/payslipView`
- `/admin/pickuppoint/add_point`
- `/admin/pickuppoint/add_student_fees`
- `/admin/pickuppoint/addmore_point`
- `/admin/pickuppoint/create`
- `/admin/pickuppoint/get_assigndetails`
- `/admin/pickuppoint/get_pickupdropdownlist`
- `/admin/pickuppoint/get_pickupdropdownlist/`
- `/admin/pickuppoint/get_pointdata`
- `/admin/pickuppoint/getpickpointlist`
- `/admin/pickuppoint/getpickuppointsbyroute/`
- `/admin/pickuppoint/pointmap`
- `/admin/pickuppoint/reorder`
- `/admin/pickuppoint/reorder_pointid`
- `/admin/pickuppoint/student_fees`
- `/admin/pickuppoint/student_transport_months`
- `/admin/print_headerfooter/edit`
- `/admin/question/add`
- `/admin/question/addform`
- `/admin/question/bulkdelete`
- `/admin/question/editform`
- `/admin/question/getDatatable`
- `/admin/question/getimages`
- `/admin/question/getinactiveDatatable`
- `/admin/question/questionsearchvalidation`
- `/admin/question/uploadfile`
- `/admin/receive`
- `/admin/requisitions/createRequisitiontopic`
- `/admin/requisitions/delete_req_doc`
- `/admin/requisitions/fetchrequisition_request_receipt`
- `/admin/requisitions/get_requisition_request_view`
- `/admin/requisitions/load_requisition_list`
- `/admin/requisitions/up_requisition_request`
- `/admin/result_remark`
- `/admin/resume/download`
- `/admin/resume/index`
- `/admin/resume/printpdfresume`
- `/admin/revaluation_form/addExamFeesProgram`
- `/admin/revaluation_form/delete_revaluation_fees`
- `/admin/revaluation_form/getrevaluationProgram`
- `/admin/revaluation_form/revaluationformsetting`
- `/admin/revaluation_form/saveFormFields`
- `/admin/roles`
- `/admin/roomtype/create`
- `/admin/route/create`
- `/admin/route/studenttransportdetails`
- `/admin/schoolhouse/create`
- `/admin/sidemenu/add_menu`
- `/admin/sidemenu/add_sub_menu`
- `/admin/sidemenu/ajax_list_menu`
- `/admin/sidemenu/getmenu`
- `/admin/sidemenu/getsubmenu`
- `/admin/sidemenu/menu_updateorder`
- `/admin/sidemenu/submenu_updateorder`
- `/admin/staff`
- `/admin/staff/ajax_attendance`
- `/admin/staff/bulk_update_leaves_export`
- `/admin/staff/bulk_update_leaves_import`
- `/admin/staff/change_password/`
- `/admin/staff/disablestaff/`
- `/admin/staff/disablestafflist`
- `/admin/staff/getEmployeeByRole`
- `/admin/staff/getLeaveByYear`
- `/admin/staff/getStaffLeaveDetailsByYear`
- `/admin/staff/leave_request_approval_report_pdf`
- `/admin/staff/setSubjectPreference/`
- `/admin/staff/staff_bulk_update/`
- `/admin/staff/staff_bulk_update_save`
- `/admin/staff_certificate/createCustomFieldsForCertificate`
- `/admin/staff_certificate/generatemultiple`
- `/admin/staff_certificate/getCertificateCustomFields`
- `/admin/staff_certificate/search`
- `/admin/staff_certificate/view`
- `/admin/staff_leave_assign/delete_leave_clubbing`
- `/admin/staff_leave_assign/delete_weekoff_rules`
- `/admin/staff_leave_assign/edit_leave_clubbing_rule`
- `/admin/staff_leave_assign/editStaffAssignForm`
- `/admin/staff_leave_assign/get_leave_clubbing_rules`
- `/admin/staff_leave_assign/get_weekoff_rules`
- `/admin/staff_leave_assign/save_assign_staff`
- `/admin/staff_leave_assign/save_leave_clubbing_rules`
- `/admin/staff_leave_assign/save_weekoff_rules`
- `/admin/staff_leave_assign/update_assign_staff`
- `/admin/staffattendance/index`
- `/admin/staffidcard/create`
- `/admin/staffidcard/view`
- `/admin/staffpayroll/add_element`
- `/admin/staffpayroll/add_payroll_dependant_elements`
- `/admin/staffpayroll/add_tax_slab`
- `/admin/staffpayroll/bulk_generate_export`
- `/admin/staffpayroll/bulk_generate_import`
- `/admin/staffpayroll/copy_from_previous_month`
- `/admin/staffpayroll/delete_child_record`
- `/admin/staffpayroll/delete_income_tax_slab/`
- `/admin/staffpayroll/delete_parent_record`
- `/admin/staffpayroll/delete_payroll_dependant/`
- `/admin/staffpayroll/generate_income_tax`
- `/admin/staffpayroll/get_payroll_elements_except_current_id`
- `/admin/staffpayroll/getForm16`
- `/admin/staffpayroll/getincometaxdetails`
- `/admin/staffpayroll/getpayelementsByID`
- `/admin/staffpayroll/getstaffbankdetails`
- `/admin/staffpayroll/getVisitingStaffPayroll`
- `/admin/staffpayroll/manage_staff_payroll`
- `/admin/staffpayroll/paymentSuccess`
- `/admin/staffpayroll/payslipView`
- `/admin/staffpayroll/printAllPayslips`
- `/admin/staffpayroll/revertGenerated`
- `/admin/staffpayroll/revertPaid`
- `/admin/staffpayroll/save_income_tax_element`
- `/admin/staffpayroll/save_manage_payroll`
- `/admin/staffpayroll/select_pay_element`
- `/admin/staffpayroll/setup_tax_slab`
- `/admin/staffpayroll/staff_payroll`
- `/admin/staffpayroll/visiting_staff_payroll`
- `/admin/stdtransfer/index`
- `/admin/stdtransfer/promote`
- `/admin/stuattendence/attendencereport`
- `/admin/stuattendence/index`
- `/admin/student_log_update`
- `/admin/studentidcard/view`
- `/admin/subject`
- `/admin/subject/importfile`
- `/admin/subjectattendence`
- `/admin/subjectattendence/attendenceList_pdf`
- `/admin/subjectattendence/get_roll_wise_student/`
- `/admin/subjectattendence/month_attendance_view`
- `/admin/subjectattendence/reportbydate`
- `/admin/subjectgroup`
- `/admin/subjectgroup/getGroupByClassandSection`
- `/admin/subjectgroup/getGroupByClassId`
- `/admin/subjectgroup/getGroupsubjects`
- `/admin/subjectgroup/getGroupsubjectsBySemesterType`
- `/admin/subjectgroup/getGroupsubjectsBySemesterTypeFeedback`
- `/admin/subjectgroup/getSemByClassandSection`
- `/admin/subjectgroup/getSemByExamgroup`
- `/admin/subjectgroup/getSemesterByClass`
- `/admin/subjectgroup/getSubjectByClassandSectionDate`
- `/admin/subjectgroup/importfile`
- `/admin/syllabus/add_syllabus`
- `/admin/syllabus/get_subject_syllabus`
- `/admin/syllabus/get_weekdates`
- `/admin/syllabus/getsubject_syllabus/`
- `/admin/syllabus/status`
- `/admin/systemfield/changeStatus`
- `/admin/teacher/assign_class_teacher`
- `/admin/teacher/saveSubjectTeacherSetup`
- `/admin/teachers_research/delete_record`
- `/admin/teachers_research/get_edit_record`
- `/admin/teachers_research/research_details`
- `/admin/timeline/add_staff_timeline`
- `/admin/timeline/delete_staff_timeline/`
- `/admin/timeline/editstafftimeline`
- `/admin/timeline/getstaffsingletimeline`
- `/admin/timeline/staff_timeline/`
- `/admin/timetable/classreport`
- `/admin/timetable/getBydategroupclasssection`
- `/admin/timetable/getteachertimetable`
- `/admin/tnp`
- `/admin/tnp/addtnpcompany`
- `/admin/tnp/compnay_delete/`
- `/admin/tnp/downloadresumeszipfiles`
- `/admin/tnp/fetchcompany_requestid`
- `/admin/tnp/updatetnpcompany`
- `/admin/tnp/view_std_achievment_list/`
- `/admin/userlog/delete/`
- `/admin/userlog/getDatatable`
- `/admin/userlog/getPaymentLogDatatable`
- `/admin/users/changeStatus`
- `/admin/vehicle/add`
- `/admin/vehicle/edit`
- `/admin/vehicle/getsinglevehicledata`
- `/admin/vehicle/vehicledetails`
- `/admin/vehroute`
- `/admin/video_tutorial/add`
- `/admin/video_tutorial/delete`
- `/admin/video_tutorial/edit`
- `/admin/video_tutorial/get`
- `/admin/video_tutorial/getPage/`
- `/admin/video_tutorial/getsection`
- `/admin/video_tutorial/searchvalidation`
- `/admin/visitors/add`
- `/admin/visitors/delete`
- `/admin/visitors/details/`
- `/admin/visitors/edit`
- `/admin/visitors/editvisitor`
- `/admin/visitors/getPrincipal`
- `/admin/visitors/getstudent`
- `/admin/visitorspurpose`

### `/atkt` (1)

- `/atkt/updateAtktFormStatus`

### `/atkt_form` (2)

- `/atkt_form/closehomeworklist`
- `/atkt_form/dthomeworklist`

### `/backend` (1)

- `/backend/dist/css/font-awesome.min.css\`

### `/category` (1)

- `/category/create`

### `/classes` (4)

- `/classes`
- `/Classes/getByProgram`
- `/classes/getByProgram`
- `/classes/getSpecializationByClass`

### `/collect` (1)

- `/collect`

### `/course_master` (3)

- `/course_master`
- `/course_master/exam_approval`
- `/course_master/get_result_approvers`

### `/delete_all_remuneration` (1)

- `/delete_all_remuneration`

### `/delete_remuneration_row` (1)

- `/delete_remuneration_row`

### `/department` (2)

- `/department`
- `/department/getCoursesByDepartment`

### `/emailconfig` (2)

- `/emailconfig/index`
- `/emailconfig/test_mail`

### `/feedback` (8)

- `/feedback/add_assigned_feedback`
- `/feedback/delete_assign_feedback/`
- `/feedback/delete_feedback_listname/`
- `/feedback/feedback_formname_master`
- `/feedback/fetchformwisefields`
- `/feedback/getsectionbyclassid`
- `/feedback/index`
- `/feedback/searchnew`

### `/feemaster` (1)

- `/feemaster/getByFeecategory`

### `/homework` (12)

- `/homework/add_evaluation`
- `/homework/closehomeworklist`
- `/homework/deletehomework`
- `/homework/dtevaluationlist/`
- `/homework/dthomeworklist`
- `/homework/edit`
- `/homework/evaluation/`
- `/homework/evaluation_report`
- `/homework/geteditRecord`
- `/homework/getuploadcriteriadata`
- `/homework/homework_docs/`
- `/homework/searchvalidation`

### `/none` (1)

- `/none`

### `/onlinecourse` (43)

- `//onlinecourse/courseassignment/evaluation/`
- `/onlinecourse/course/coursedetail`
- `/onlinecourse/course/coursepreview`
- `/onlinecourse/course/create`
- `/onlinecourse/course/getcourselist`
- `/onlinecourse/course/index`
- `/onlinecourse/course/publish_unpublish`
- `/onlinecourse/course/savesetting`
- `/onlinecourse/course/setting`
- `/onlinecourse/course/updatecourse`
- `/onlinecourse/courseassignment/add_course_assignment`
- `/onlinecourse/courseassignment/add_evaluation/`
- `/onlinecourse/coursecategory/categoryadd`
- `/onlinecourse/courseexam/add_course_exam`
- `/onlinecourse/courseexam/deleteExamQuestions`
- `/onlinecourse/courseexam/getExamQuestions`
- `/onlinecourse/courseexam/questionAdd`
- `/onlinecourse/courseexamquestion/add`
- `/onlinecourse/courseexamquestion/addform`
- `/onlinecourse/courseexamquestion/bulkdelete`
- `/onlinecourse/courseexamquestion/editform`
- `/onlinecourse/courseexamquestion/getDatatable`
- `/onlinecourse/courseexamquestion/getimages`
- `/onlinecourse/courseexamquestion/questionsearchvalidation`
- `/onlinecourse/courseexamquestion/search_question`
- `/onlinecourse/courseexamquestion/uploadfile`
- `/onlinecourse/courselesson/addlesson`
- `/onlinecourse/courselesson/editlesson`
- `/onlinecourse/courselesson/get_lesson_attachment`
- `/onlinecourse/coursequiz/add`
- `/onlinecourse/coursequiz/addnewquestion`
- `/onlinecourse/coursequiz/edit`
- `/onlinecourse/coursequiz/editnewquestion`
- `/onlinecourse/coursesection/addsection/`
- `/onlinecourse/coursesection/editsection`
- `/onlinecourse/offlinepayment/checkvalidation`
- `/onlinecourse/offlinepayment/courselist`
- `/onlinecourse/offlinepayment/paid`
- `/onlinecourse/offlinepayment/print`
- `/onlinecourse/offlinepayment/revert`
- `/onlinecourse/offlinepayment/search`
- `/onlinecourse/offlinepayment/studentlist`
- `/onlinecourse/offlinepayment/success`

### `/outcome_basis_education` (3)

- `/outcome_basis_education/assessment_tool_co_pdf`
- `/outcome_basis_education/index`
- `/outcome_basis_education/save_co_assessment_attainment`

### `/process.php` (1)

- `/process.php`

### `/Programintake` (1)

- `/Programintake`

### `/railway_concession` (5)

- `/railway_concession/add_concession`
- `/railway_concession/delete_concession`
- `/railway_concession/fetch_student_details`
- `/railway_concession/get_concession`
- `/railway_concession/getConcessionList`

### `/report` (7)

- `/report/alumnireport`
- `/Report/get_betweendate/`
- `/report/inward_report`
- `/report/lesson_plan/`
- `/report/railway_concession_report`
- `/report/teacherachievement_report`
- `/report/teacheraward_report`

### `/roombooking` (14)

- `/roombooking/roombook/approve`
- `/roombooking/roombook/bulkApprove`
- `/roombooking/roombook/cancel`
- `/roombooking/roombook/checkBookedvalidation`
- `/roombooking/Roombook/checkBookedvalidation`
- `/roombooking/Roombook/delete`
- `/roombooking/Roombook/getdata`
- `/roombooking/roombook/getrromrequestData`
- `/roombooking/Roombook/load`
- `/roombooking/roombook/reject`
- `/roombooking/roombook/roombookrequestlist`
- `/roombooking/Roombook/save_room`
- `/roombooking/Roombook/save_room_request`
- `/roombooking/Roombook/update`

### `/schsettings` (1)

- `/schsettings/generalsetting`

### `/seating_arrangement` (9)

- `/seating_arrangement`
- `/seating_arrangement/assign_block`
- `/seating_arrangement/assign_block_save`
- `/seating_arrangement/create_block_number/`
- `/seating_arrangement/delete_seatarrangement`
- `/seating_arrangement/getSubjectsFromExam`
- `/seating_arrangement/index`
- `/seating_arrangement/searchexamseatnumbers/`
- `/seating_arrangement/subjectexamsave`

### `/sections` (3)

- `/sections`
- `/sections/`
- `/sections/getByClass`

### `/sectionwise_specialization` (3)

- `/sectionwise_specialization`
- `/sectionwise_specialization/assign_program/`
- `/sectionwise_specialization/getspecializationBysectionid`

### `/sessions` (1)

- `/sessions/create`

### `/smsconfig` (2)

- `/smsconfig/mponline`
- `/smsconfig/twilio`

### `/staff_id` (1)

- `/staff_id`

### `/stdscholarship` (4)

- `/stdscholarship/ajax_updatescholrno`
- `/stdscholarship/markstd_scholarshipflaged`
- `/stdscholarship/search`
- `/stdscholarship/stdajaxSearch`

### `/student` (36)

- `/student/ajax_delete`
- `/student/ajax_update`
- `/student/approve_optional_course`
- `/student/assign_optional_course`
- `/student/assign_seat_number`
- `/student/assign_seat_studentlist`
- `/student/bulkapprove_selected_students`
- `/student/bulkdelete`
- `/student/bulkmail`
- `/student/bulkupdate`
- `/student/changeprofilesetting`
- `/student/check_subject_exam_assignment`
- `/student/create`
- `/student/disablestudentslist`
- `/student/dtstudentlist`
- `/student/generaterollnumber`
- `/student/get_updatedData`
- `/student/getBycategory`
- `/student/getByClassAndSection`
- `/student/getexamseatnocount`
- `/student/getGroupsubjects`
- `/student/getMaxRollNumber`
- `/student/getStudentRecordByID`
- `/student/multiclass`
- `/student/profilesetting`
- `/student/save_approveSubject_request`
- `/student/save_row_data`
- `/student/save_row_data_student`
- `/student/save_updatedData`
- `/student/searchvalidation`
- `/student/sendbulkmail`
- `/student/student_bulk_upload`
- `/student/student_dashboard`
- `/student/student_document_verify`
- `/student/upload_student_documents/`
- `/student/upload_student_photo`

### `/studentfee` (8)

- `/studentfee/ajaxSearch`
- `/studentfee/fee_summary_dashboard`
- `/studentfee/feereceipt`
- `/studentfee/feesearch`
- `/studentfee/getStudentListByType`
- `/studentfee/printFeesByName`
- `/studentfee/search`
- `/studentfee/searchpayment`

### `/teacherlog` (7)

- `/teacherlog`
- `/teacherlog/add`
- `/teacherlog/approvetechlog`
- `/teacherlog/fetchtecherlog_request`
- `/teacherlog/load_teacherlog_viewpage`
- `/teacherlog/teacherlog_remove/`
- `/teacherlog/update`

### `/testmail` (4)

- `/testmail/sendmail`
- `/testmail/sendpayment`
- `/testmail/sendsms`
- `/testmail/test_mail`

### `/uploads` (4)

- `/uploads/homework/`
- `/uploads/requisition/`
- `/uploads/teacher_log_documents/`
- `/uploads/tnp/`

### `/user` (2)

- `/user/exam/semesterWiseSubject`
- `/user/examschedule/getexamscheduledetail`

## Per-page endpoint counts

| Page | Status | Extra endpoints |
|---|---|---|
| `/admin/admin/changepass` | 200 | 9 |
| `/admin/admin/dashboard` | 200 | 10 |
| `/admin/admin/filetype` | 200 | 11 |
| `/admin/admission/admission_dashboard` | 200 | 9 |
| `/admin/admission/cutofflist` | 200 | 6 |
| `/admin/admission/generatemeritlist` | 200 | 6 |
| `/admin/admission/importapplication` | 200 | 7 |
| `/admin/admission/manageadmission` | 200 | 8 |
| `/admin/admission/report` | 200 | 10 |
| `/admin/admission/selection_status_report` | 200 | 9 |
| `/admin/admission/summary_report` | 200 | 8 |
| `/admin/admission_transfer_cancellation/transfer_cancellation_list` | 200 | 17 |
| `/admin/admitcard` | 200 | 10 |
| `/admin/alumni/alumnilist` | 200 | 13 |
| `/admin/alumni/events` | 200 | 12 |
| `/admin/approve_leave` | 200 | 15 |
| `/admin/assign_mentor` | 200 | 13 |
| `/admin/assign_mentor/ojt_approval_list` | 200 | 12 |
| `/admin/assign_mentor/ojt_details` | 200 | 8 |
| `/admin/assign_mentor/project_approval_list` | 200 | 9 |
| `/admin/assign_mentor/project_chapter_list` | 200 | 8 |
| `/admin/assign_variable_fees` | 200 | 11 |
| `/admin/atkt_form/admissionsetting` | 200 | 13 |
| `/admin/atkt_form/atkt_form_report` | 200 | 14 |
| `/admin/atkt_form/atkt_form_student` | 200 | 17 |
| `/admin/atkt_form/edit_atkt_form_student` | 200 | 16 |
| `/admin/attributes/index` | 200 | 7 |
| `/admin/audit` | 200 | 10 |
| `/admin/batch_settings` | 200 | 9 |
| `/admin/book/getall` | 200 | 9 |
| `/admin/calendar/events` | 200 | 10 |
| `/admin/canteen/assign_menu` | 200 | 19 |
| `/admin/canteen/canteen_auditor` | 200 | 11 |
| `/admin/canteen/create_coupon` | 200 | 11 |
| `/admin/canteen/getall_breaktype` | 200 | 11 |
| `/admin/canteen/getall_canteen` | 200 | 11 |
| `/admin/canteen/getall_foodItem` | 200 | 11 |
| `/admin/canteen/menu_list` | 200 | 9 |
| `/admin/captcha` | 200 | 9 |
| `/admin/certificate` | 200 | 11 |
| `/admin/certificate_report` | 200 | 11 |
| `/admin/chat` | 200 | 17 |
| `/admin/classroom/classroom_allotment` | 200 | 8 |
| `/admin/classroom/classroom_setup` | 200 | 7 |
| `/admin/complaint` | 200 | 11 |
| `/admin/conference` | 200 | 9 |
| `/admin/conference/class_report` | 200 | 11 |
| `/admin/conference/meeting` | 200 | 16 |
| `/admin/conference/meeting_report` | 200 | 9 |
| `/admin/conference/timetable` | 200 | 13 |
| `/admin/content/list` | 200 | 10 |
| `/admin/content/upload` | 200 | 19 |
| `/admin/contenttype` | 200 | 10 |
| `/admin/copo/co_po_mapping` | 200 | 14 |
| `/admin/copo/course_outcomes` | 200 | 15 |
| `/admin/copo/indirect_po_mapping` | 200 | 14 |
| `/admin/copo/lesson` | 200 | 16 |
| `/admin/copo/plan` | 200 | 36 |
| `/admin/copo/program_outcomes` | 200 | 10 |
| `/admin/copo/tlp_approve_list` | 200 | 14 |
| `/admin/currency` | 200 | 12 |
| `/admin/customfield` | 200 | 11 |
| `/admin/dashboard` | 200 | 11 |
| `/admin/department/department` | 200 | 9 |
| `/admin/designation/designation` | 200 | 9 |
| `/admin/disable_reason` | 200 | 9 |
| `/admin/dispatch` | 200 | 10 |
| `/admin/enquiry` | 200 | 16 |
| `/admin/exam_schedule` | 200 | 12 |
| `/admin/examgroup` | 200 | 13 |
| `/admin/examgroup/displaymarksexamsubjwise` | 200 | 15 |
| `/admin/examgroup/exam_form` | 200 | 18 |
| `/admin/examgroup/exam_remuneration_bill` | 200 | 19 |
| `/admin/examgroup/exam_type` | 200 | 9 |
| `/admin/examgroup/markEntrySingleSubject` | 200 | 15 |
| `/admin/examgroup/markEntrySubjectwise` | 200 | 13 |
| `/admin/examgroup/remuneration_hoursetup` | 200 | 9 |
| `/admin/examgroup/remuneration_setup` | 200 | 9 |
| `/admin/examgroup/revaluation_form` | 200 | 17 |
| `/admin/exammarksheet` | 200 | 9 |
| `/admin/exammarksheet/marksheet` | 200 | 14 |
| `/admin/examresult` | 200 | 11 |
| `/admin/examresult/admitcard` | 200 | 15 |
| `/admin/examresult/backlog` | 200 | 9 |
| `/admin/examresult/exam_result_block_unblock` | 200 | 11 |
| `/admin/examresult/examinations` | 200 | 8 |
| `/admin/examresult/marksheet` | 200 | 15 |
| `/admin/expense` | 200 | 10 |
| `/admin/expense/expensesearch` | 200 | 10 |
| `/admin/expensehead` | 200 | 10 |
| `/admin/fee_receipt_import` | 200 | 9 |
| `/admin/feediscount` | 200 | 9 |
| `/admin/feegroup` | 200 | 9 |
| `/admin/feemaster` | 200 | 10 |
| `/admin/feemastercoursewise` | 200 | 14 |
| `/admin/feereminder/setting` | 200 | 9 |
| `/admin/fees_installment` | 200 | 9 |
| `/admin/fees_type_group` | 200 | 9 |
| `/admin/feesforward` | 200 | 10 |
| `/admin/feetype` | 200 | 9 |
| `/admin/fine_rules` | 200 | 9 |
| `/admin/flowmaster/add_event` | 200 | 11 |
| `/admin/flowmaster/event_list` | 200 | 30 |
| `/admin/front/banner` | 200 | 11 |
| `/admin/front/events` | 200 | 8 |
| `/admin/front/gallery` | 200 | 8 |
| `/admin/front/media` | 200 | 11 |
| `/admin/front/menus` | 200 | 9 |
| `/admin/front/notice` | 200 | 8 |
| `/admin/front/page` | 200 | 8 |
| `/admin/frontcms` | 200 | 9 |
| `/admin/generalcall` | 200 | 11 |
| `/admin/generatecertificate` | 200 | 12 |
| `/admin/generateidcard/search` | 200 | 14 |
| `/admin/generatestaffidcard` | 200 | 11 |
| `/admin/gmeet/class_report` | 200 | 11 |
| `/admin/gmeet/index` | 200 | 9 |
| `/admin/gmeet/meeting` | 200 | 13 |
| `/admin/gmeet/meeting_report` | 200 | 9 |
| `/admin/gmeet/timetable` | 200 | 12 |
| `/admin/grade` | 200 | 9 |
| `/admin/grade/relative_Grade` | 200 | 9 |
| `/admin/holiday/set_working_days` | 200 | 13 |
| `/admin/holiday/staff_week_off` | 200 | 11 |
| `/admin/hostel` | 200 | 9 |
| `/admin/hostel/assign_room` | 200 | 19 |
| `/admin/hostel/change_room` | 200 | 18 |
| `/admin/hostel/gatepass_list` | 200 | 10 |
| `/admin/hostel/scan_qrcode` | 200 | 13 |
| `/admin/hostel/vacancy_status` | 200 | 9 |
| `/admin/hostelroom` | 200 | 9 |
| `/admin/hostelroom/studenthosteldetails` | 200 | 11 |
| `/admin/hr_recruitment` | 200 | 8 |
| `/admin/income` | 200 | 10 |
| `/admin/income/incomesearch` | 200 | 10 |
| `/admin/incomehead` | 200 | 9 |
| `/admin/inward/inward_list` | 200 | 28 |
| `/admin/issueitem` | 200 | 10 |
| `/admin/item` | 200 | 9 |
| `/admin/itemcategory` | 200 | 9 |
| `/admin/itemstock` | 200 | 11 |
| `/admin/itemstore` | 200 | 9 |
| `/admin/itemsupplier` | 200 | 9 |
| `/admin/language` | 200 | 14 |
| `/admin/leave_batch_years` | 200 | 9 |
| `/admin/leaverequest/leaverequest` | 200 | 18 |
| `/admin/leavetypes` | 200 | 9 |
| `/admin/lessonplan/copylesson` | 200 | 12 |
| `/admin/lessonplan/instruction_plan` | 200 | 15 |
| `/admin/lessonplan/lesson` | 200 | 14 |
| `/admin/lessonplan/topic` | 200 | 14 |
| `/admin/liberal_art/admissionsetting` | 200 | 11 |
| `/admin/liberal_art/liberal_art_report` | 200 | 14 |
| `/admin/liberal_art/liberal_art_student` | 200 | 13 |
| `/admin/mailsms/compose` | 200 | 19 |
| `/admin/mailsms/compose_sms` | 200 | 15 |
| `/admin/mailsms/email_template` | 200 | 12 |
| `/admin/mailsms/index` | 200 | 8 |
| `/admin/mailsms/schedule` | 200 | 9 |
| `/admin/mailsms/sms_template` | 200 | 11 |
| `/admin/marksdivision` | 200 | 9 |
| `/admin/marksheet` | 200 | 10 |
| `/admin/member` | 200 | 8 |
| `/admin/member/student` | 200 | 12 |
| `/admin/member/teacher` | 200 | 10 |
| `/admin/module` | 200 | 10 |
| `/admin/multibranch/branch` | 401 | 0 |
| `/admin/multibranch/branch/overview` | 200 | 8 |
| `/admin/multibranch/finance/index` | 200 | 8 |
| `/admin/naac/events` | 200 | 10 |
| `/admin/naac/index` | 200 | 9 |
| `/admin/naac/naac_dashboard` | 200 | 8 |
| `/admin/naac/naac_report` | 200 | 10 |
| `/admin/naac/naac_report_master` | 200 | 10 |
| `/admin/naac/student_feedback_list` | 200 | 11 |
| `/admin/naac/student_rating_form` | 200 | 10 |
| `/admin/naac/task_allocation` | 200 | 10 |
| `/admin/notification` | 200 | 9 |
| `/admin/notification/setting` | 200 | 11 |
| `/admin/offlinepayment` | 200 | 10 |
| `/admin/onlineadmission/admissionsetting` | 200 | 41 |
| `/admin/onlineexam` | 200 | 21 |
| `/admin/onlineexam/report` | 200 | 13 |
| `/admin/onlineinternatinaladmission/admissionsetting` | 200 | 0 |
| `/admin/onlinestudent` | 200 | 10 |
| `/admin/others_fees_verification` | 200 | 11 |
| `/admin/outward/outward_list` | 200 | 27 |
| `/admin/paper_creation` | 200 | 15 |
| `/admin/paper_creation/assign_paper_creation` | 200 | 16 |
| `/admin/paper_creation/que_paper_approval_list` | 200 | 10 |
| `/admin/papersetting` | 200 | 20 |
| `/admin/paymentcategory` | 200 | 10 |
| `/admin/paymentcategory/assignPaymentCategory` | 200 | 11 |
| `/admin/paymentcategory/collegeotherfees` | 200 | 10 |
| `/admin/paymentcategory/multimerchant` | 200 | 10 |
| `/admin/paymentsettings` | 200 | 36 |
| `/admin/payroll` | 200 | 15 |
| `/admin/pickuppoint` | 200 | 12 |
| `/admin/pickuppoint/assign` | 200 | 14 |
| `/admin/pickuppoint/student_fees` | 200 | 12 |
| `/admin/print_headerfooter` | 200 | 9 |
| `/admin/question` | 200 | 18 |
| `/admin/receive` | 200 | 10 |
| `/admin/requisitions` | 200 | 10 |
| `/admin/requisitions/load_requisition_list` | 200 | 13 |
| `/admin/result_remark` | 200 | 10 |
| `/admin/resume/download` | 200 | 11 |
| `/admin/resume/index` | 200 | 11 |
| `/admin/revaluation_form/revaluationformsetting` | 200 | 13 |
| `/admin/roles` | 200 | 9 |
| `/admin/roomtype` | 200 | 9 |
| `/admin/route` | 200 | 9 |
| `/admin/route/studenttransportdetails` | 200 | 11 |
| `/admin/schoolhouse` | 200 | 9 |
| `/admin/sidemenu` | 200 | 16 |
| `/admin/staff` | 200 | 12 |
| `/admin/staff/disablestafflist` | 200 | 9 |
| `/admin/staff/leaverequest` | 200 | 21 |
| `/admin/staff/profile/395` | 200 | 22 |
| `/admin/staff/rating` | 200 | 8 |
| `/admin/staff/staff_bulk_update` | 200 | 10 |
| `/admin/staff_certificate` | 200 | 10 |
| `/admin/staff_certificate/staff_generate_certificate` | 200 | 11 |
| `/admin/staff_leave_assign` | 200 | 18 |
| `/admin/staffattendance` | 200 | 9 |
| `/admin/staffidcard` | 200 | 10 |
| `/admin/staffpayroll/add_element` | 200 | 10 |
| `/admin/staffpayroll/add_income_tax_element` | 200 | 11 |
| `/admin/staffpayroll/generate_income_tax` | 200 | 13 |
| `/admin/staffpayroll/manage_staff_payroll` | 200 | 13 |
| `/admin/staffpayroll/select_pay_element` | 200 | 9 |
| `/admin/staffpayroll/setup_tax_slab` | 200 | 11 |
| `/admin/staffpayroll/staff_payroll` | 200 | 20 |
| `/admin/staffpayroll/visiting_staff_payroll` | 200 | 11 |
| `/admin/stdtransfer` | 200 | 13 |
| `/admin/stuattendence` | 200 | 10 |
| `/admin/stuattendence/attendencereport` | 200 | 10 |
| `/admin/student_log_update` | 200 | 10 |
| `/admin/studentidcard` | 200 | 9 |
| `/admin/subject` | 200 | 10 |
| `/admin/subjectattendence/index` | 200 | 14 |
| `/admin/subjectattendence/reportbydate` | 200 | 10 |
| `/admin/subjectgroup` | 200 | 12 |
| `/admin/syllabus` | 200 | 15 |
| `/admin/syllabus/status` | 200 | 15 |
| `/admin/systemfield` | 200 | 9 |
| `/admin/teacher/assign_class_teacher` | 200 | 11 |
| `/admin/teacher/assign_subject_teacher` | 200 | 9 |
| `/admin/teachers_research/` | 200 | 11 |
| `/admin/timetable/classreport` | 200 | 12 |
| `/admin/timetable/mytimetable` | 200 | 9 |
| `/admin/tnp` | 200 | 11 |
| `/admin/tnp/tnp_company_list` | 200 | 13 |
| `/admin/transport/feemaster` | 200 | 8 |
| `/admin/updater` | 200 | 8 |
| `/admin/userlog` | 200 | 10 |
| `/admin/userlog/paymentLog` | 200 | 9 |
| `/admin/users` | 200 | 9 |
| `/admin/vehicle` | 200 | 12 |
| `/admin/vehroute` | 200 | 9 |
| `/admin/video_tutorial` | 200 | 16 |
| `/admin/visitors` | 200 | 16 |
| `/admin/visitorspurpose` | 200 | 9 |
| `/attendencereports/attendance` | 200 | 8 |
| `/category` | 200 | 9 |
| `/classes` | 200 | 9 |
| `/course_master` | 200 | 12 |
| `/department` | 200 | 9 |
| `/emailconfig` | 200 | 14 |
| `/feedback/assign_feedback_form` | 200 | 14 |
| `/feedback/feedback_formname_master` | 200 | 11 |
| `/feedback/fill_feedback_form` | 200 | 8 |
| `/feedback/index` | 200 | 9 |
| `/feedback/showview_feedback_form` | 200 | 8 |
| `/feedback/submitted_forms` | 200 | 8 |
| `/feedbackreport/index` | 200 | 8 |
| `/financereports/finance` | 200 | 8 |
| `/homework` | 200 | 23 |
| `/homework/dailyassignment` | 404 | 0 |
| `/homework/evaluation_report` | 200 | 12 |
| `/homework/homeworkordailyassignmentreport` | 404 | 0 |
| `/onlinecourse/course/index` | 200 | 33 |
| `/onlinecourse/course/setting` | 200 | 10 |
| `/onlinecourse/coursecategory/categoryadd` | 200 | 9 |
| `/onlinecourse/courseexamquestion/index` | 200 | 16 |
| `/onlinecourse/coursereport/report` | 200 | 8 |
| `/onlinecourse/offlinepayment/payment` | 200 | 17 |
| `/outcome_basis_education/index` | 200 | 15 |
| `/Programintake` | 200 | 13 |
| `/railway_concession/index` | 200 | 13 |
| `/report/alumnireport` | 200 | 13 |
| `/report/flowmaster_report` | 200 | 8 |
| `/report/human_resource` | 200 | 8 |
| `/report/inventory` | 200 | 8 |
| `/report/inward_report` | 200 | 10 |
| `/report/lesson_plan` | 200 | 12 |
| `/report/library` | 200 | 8 |
| `/report/outward_report` | 200 | 8 |
| `/report/railway_concession_report` | 200 | 9 |
| `/report/setFrontOfficeReport` | 200 | 8 |
| `/report/studentinformation` | 200 | 8 |
| `/report/teacherachievement_report` | 200 | 9 |
| `/report/teacheraward_report` | 200 | 10 |
| `/roombooking/roombook` | 200 | 15 |
| `/roombooking/roombook/roombookrequest` | 200 | 16 |
| `/roombooking/roombook/roombookrequestlist` | 200 | 15 |
| `/schsettings` | 200 | 9 |
| `/seating_arrangement/assign_block` | 200 | 14 |
| `/seating_arrangement/index` | 200 | 13 |
| `/seating_arrangement/report` | 200 | 8 |
| `/sections` | 200 | 9 |
| `/sectionwise_specialization` | 200 | 9 |
| `/sectionwise_specialization/assign_program` | 200 | 9 |
| `/sessions` | 200 | 9 |
| `/smsconfig` | 200 | 11 |
| `/staffpayrollreports/staff_payroll` | 200 | 8 |
| `/stdscholarship` | 200 | 13 |
| `/student/approve_optional_course` | 200 | 13 |
| `/student/assign_optional_course` | 200 | 12 |
| `/student/assign_seat_number` | 200 | 13 |
| `/student/bulkdelete` | 200 | 11 |
| `/student/bulkmail` | 200 | 11 |
| `/student/bulkupdate` | 200 | 16 |
| `/student/create` | 200 | 16 |
| `/student/disablestudentslist` | 200 | 13 |
| `/student/generaterollnumber` | 200 | 12 |
| `/student/multiclass` | 200 | 10 |
| `/student/profilesetting` | 200 | 10 |
| `/student/search` | 200 | 14 |
| `/student/semester_allocation` | 200 | 11 |
| `/student/student_bulk_upload` | 200 | 9 |
| `/student/student_dashboard` | 200 | 11 |
| `/student/upload_student_documents` | 200 | 9 |
| `/student/upload_student_photo` | 200 | 9 |
| `/studentfee` | 200 | 11 |
| `/studentfee/fee_summary_dashboard` | 200 | 12 |
| `/studentfee/feereceipt` | 200 | 11 |
| `/studentfee/feesearch` | 200 | 10 |
| `/studentfee/searchpayment` | 200 | 9 |
| `/teacherlog` | 200 | 16 |
