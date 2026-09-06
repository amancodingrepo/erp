# LMS, communication, public CMS

## Online course (addon)

| Screen | Route |
|---|---|
| Courses | `/onlinecourse/course/index` |
| Offline Payment | `/onlinecourse/offlinepayment/payment` |
| Category | `/onlinecourse/coursecategory/categoryadd` |
| Question Bank | `/onlinecourse/courseexamquestion/index` |
| Report | `/onlinecourse/coursereport/report` |
| Setting | `/onlinecourse/course/setting` |

Course: title, category, price, sections/lessons (video/pdf), quiz from question bank, enrollment (paid/free), progress.

Guest signup on public site: POST `/course/guestsignup`.

## Live classes

Google Meet `/admin/gmeet/*` and Zoom `/admin/conference/*`

Each: timetable of live classes, ad-hoc meetings, class report, meeting report, API credentials settings.

A live class row: subject, class-section, teacher, start, meeting URL, recording link.

## Download center

Content type master, upload/share content (class/section/student scoped), list, video tutorials.

This is the “study material” drive.

## Communicate

| Notice Board | `/admin/notification` |
| Send Email | `/admin/mailsms/compose` |
| Send SMS | `/admin/mailsms/compose_sms` |
| Email/SMS Log | `/admin/mailsms/index` |
| Schedule log | `/admin/mailsms/schedule` |
| Send login credentials | `/student/bulkmail` |
| Email template | `/admin/mailsms/email_template` |
| SMS template | `/admin/mailsms/sms_template` |
| Notification setting | `/admin/notification/setting` |

Notice: title, body, audience (all / role / class), attach, publish date.

Compose: pick audience → template → send now or schedule.

## Chat

Upstream product has `/admin/chat`. Confirm if enabled in a given tenant via Modules.

## Front CMS (public website)

| Event | `/admin/front/events` |
| Gallery | `/admin/front/gallery` |
| News | `/admin/front/notice` |
| Media Manager | `/admin/front/media` |
| Pages | `/admin/front/page` |
| Menus | `/admin/front/menus` |
| Banner Images | `/admin/front/banner` |
| CMS setting | `/admin/frontcms` |

Public routes live:
- `/frontend` or `/page/home`
- `/page/events`
- `/read/{slug}` e.g. `/read/notice-about-addmission`
- `/online_admission`

Rebuild CMS as a tiny headless page/menu/media model; do not generate a new WordPress.

## Student CV

Build `/admin/resume/index`, download `/admin/resume/download`.
Resume sections pulled from student profile + achievements.

## Activity management

Add activity `/admin/flowmaster/add_event`, list `/admin/flowmaster/event_list`.
College events/clubs with participants — used in reports `/report/flowmaster_report`.
