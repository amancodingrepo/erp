# Messages / Requests

Route: `/messages`  
Page title in the product: **Requests**

Related: `/Admin/BranchMessages` (staff contact picker + Inbox/Sent).  
Related: `/Admin/BranchMessages/DisableRoleCommunication` (block parent → role).

**Not used:** Post, Delete, Save changes on any modal, Search submit, SMS send, view more (could mark seen).

---

## What it is

Private 1:1 (or 1:n) thread between a parent and school staff. Inbox rows look like:

`PARENT NAME (CHILD NAME - CLASS) to me` + preview + relative time (`3 days ago`) + **view more** + **Delete**.

This is not the Notice Board (broadcast channels). Same `ChannelMessageId` hidden field exists, so it may share a message store with notices.

Status model: **Open** | **Closed** (ticket-like). Reject-reason and edit-message modals exist.

---

## Composer — Post Quick Message

Do not press **Post**.

| Control | Function |
| --- | --- |
| Rich / plain textarea `#message` | Body |
| File icon | `#picModal` attach file (drag-drop). Also `fileUpload`, `bulkFileUpload` |
| Calendar icon | `#scheduleModal` — “Choose a Schedule”, field placeholder **Deliver By** |
| People icon | `#recipientsModal` “Choose Recipient(s)” and/or `#categoryContactsModal` |
| **Post** | Send now (or at scheduled time) |

### Recipient pickers

- Individual recipients
- By category: Fees, Transport, Academics, Uniforms, Library, Others  
  (same buckets as staff “Role Categories”)
- `#childrenModal` — “Choose Student” / “No Student Specific”

### SMS overlay `#smsNotificationModal`

Optional SMS to selected recipients. Flags:

- Send SMS to selected recipient(s)
- Send SMS in regional language  
TRAI notice: informational only, no promotional text.

---

## List chrome

| Control | Function |
| --- | --- |
| Inbox | Incoming from parents (this account had many) |
| Sent | Outbound. Empty for this Branch Admin session |
| Typeahead | “Start typing to filter list…” live filter on loaded rows |
| Magnifier | Apply typeahead |
| X | Clear typeahead |
| **Filter** | Opens `#searchMessageModal` (advanced search) |
| **More** | **Unseen**, **Scheduled** |

---

## Advanced filters (`#searchMessageModal`)

Buttons in modal: **Search**, **Clear Search**. Not submitted.

| Field | Name | Type |
| --- | --- | --- |
| First Name | `RecipientFirstName` | text |
| Last Name | `RecipientLastName` | text |
| Message | `TextMessage` | text contains |
| Hash Tag | `HashTag` | text |
| Class | `GradeId` | select all classes |
| Category | `Category` | Fees, Transport, Academics, Uniforms, Library, Others |
| Status | `Status` | Open, Closed |
| From Date | `FromDate` | `dd-MMM-yyyy` |
| To Date | `ToDate` | `dd-MMM-yyyy` |

---

## Other hidden workflows

| Modal | Purpose |
| --- | --- |
| `reject-reason-modal` | Close/reject with reason |
| `edit-message-modal` | Edit body |
| `scheduleModal` | Deferred delivery |
| `smsNotificationModal` | Parallel SMS |

---

## Suggested tables

```
messages
  id, branch_id, thread_id, channel_message_id
  sender_user_id, recipient_user_id
  student_id nullable
  category   -- fees|transport|academics|uniforms|library|others
  body, hashtag
  status     -- open|closed
  scheduled_at, delivered_at
  seen_at
  sms_also bool
  created_at

message_attachments
message_recipients   -- for fan-out
```

Inbox query: `recipient = me`, not deleted.  
Sent: `sender = me`.  
Unseen: `seen_at is null`.  
Scheduled: `scheduled_at > now()` and not delivered.

One-way communication: if parent role is blocked from messaging a role, hide composer toward that role on the parent app.
