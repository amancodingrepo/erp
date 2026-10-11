# Notice Board

Route: `/NoticeBoard?schoolBranchId={branch}&channelId={channel}&type={type}&academicYearId={year}`

Opened school channel and one class channel. **Post / Delete / Export Views / Export Not Viewed were not used.**

---

## Channel tree (left)

Year dropdown `ActiveAcademicYearId`.

Channel filter: “Start typing to filter list…”

| Group | Channels |
| --- | --- |
| School Notice Board | All Teachers, current branch name (whole school), Day Care |
| Class Notice Boards | one channel per class/section (expand +/−) |
| Route Notice Boards | one channel per bus route |

Selecting a channel sets `channelId`. Audience of that post = members of that channel (all parents of the class, all staff, all parents on a route, etc.).

---

## Composer (do not Post)

- Hint: “You can add hashtags in messages.”
- Body: “Enter your text here.”
- Attach file (drag-drop modal)
- Extra **+** on class boards (more attach / extra actions)
- **Enable Reply** checkbox
- Type dropdown `ActiveMessageType`
- **Post**

### Types

**School / staff / daycare / route**

- News
- Alert

**Class boards add**

- Homework - Worksheet
- Homework - Assignment

Feed tabs on class: **News** | **Alert** | **Home Connect**  
Home Connect URL uses `type=Homework`.

---

## Feed

Tabs match types above.

List filter: Filter button + typeahead + search + clear.

Card:

- Author + “(from {channel} Notice Board)”
- Timestamp
- Body (text, image, video)
- **N Views**
- **Export Views** (who read)
- **Export Not Viewed** (who did not)
- **Delete**

Read-receipts are per recipient on the channel membership list.

---

## Advanced filter (same idea as Messages)

First Name, Last Name, Message, Hash Tag, From Date, To Date.

---

## Data model to build

```
channels
  id, branch_id, academic_year_id
  kind     -- school | teachers | daycare | class | route
  class_id nullable, route_id nullable

channel_members
  channel_id, user_id, student_id nullable

notices
  id, channel_id, author_id
  type     -- news | alert | homework_worksheet | homework_assignment
  body, hashtags[]
  allow_reply
  created_at

notice_attachments
notice_reads
  notice_id, user_id, read_at
```

Views count = rows in `notice_reads`.  
Export Views = members with a read.  
Export Not Viewed = members minus reads.

Approval workflow exists at Org Admin on some tenants; this Branch Admin composer posts directly.
