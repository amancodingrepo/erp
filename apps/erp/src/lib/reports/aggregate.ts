/** Group live rows. Status/gender/channel values come from the data, not a fixed list. */

export function strengthRows(
  enrollments: Array<{
    className: string;
    sectionName: string;
    gender: string | null;
  }>,
) {
  const grouped = new Map<
    string,
    { class: string; section: string; gender: string; count: number }
  >();
  for (const row of enrollments) {
    const gender = row.gender ?? "";
    const key = `${row.className}\0${row.sectionName}\0${gender}`;
    const current = grouped.get(key) ?? {
      class: row.className,
      section: row.sectionName,
      gender,
      count: 0,
    };
    current.count += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) =>
    `${a.class} ${a.section} ${a.gender}`.localeCompare(
      `${b.class} ${b.section} ${b.gender}`,
    ),
  );
}

export function dailyAttendanceRows(
  marks: Array<{
    date: Date | string;
    className: string;
    sectionName: string;
    status: string;
  }>,
) {
  const grouped = new Map<
    string,
    { date: string; class: string; section: string; status: string; count: number }
  >();
  for (const mark of marks) {
    const date =
      typeof mark.date === "string"
        ? mark.date.slice(0, 10)
        : mark.date.toISOString().slice(0, 10);
    const key = `${date}\0${mark.className}\0${mark.sectionName}\0${mark.status}`;
    const current = grouped.get(key) ?? {
      date,
      class: mark.className,
      section: mark.sectionName,
      status: mark.status,
      count: 0,
    };
    current.count += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) =>
    `${a.date} ${a.class} ${a.section} ${a.status}`.localeCompare(
      `${b.date} ${b.class} ${b.section} ${b.status}`,
    ),
  );
}

export function noticeViewRows(
  notices: Array<{
    id: string;
    title: string;
    channelKind: string;
    type: string;
    publishAt: Date;
  }>,
  reads: Array<{ noticeId: string }>,
) {
  const counts = new Map<string, number>();
  for (const read of reads) {
    counts.set(read.noticeId, (counts.get(read.noticeId) ?? 0) + 1);
  }
  return notices.map((notice) => ({
    title: notice.title,
    channel: notice.channelKind,
    type: notice.type,
    publishAt: notice.publishAt.toISOString().slice(0, 10),
    readCount: counts.get(notice.id) ?? 0,
  }));
}

export function reportLabel(key: string) {
  return key.replace(/-/g, " ");
}

export function fuelLogRows(
  logs: Array<{
    vehicleId: string;
    litres: number;
    amount: number;
    odometer: number | null;
    at: string;
    note: string;
  }>,
) {
  return logs.map((row) => ({
    vehicleId: row.vehicleId,
    litres: row.litres,
    amount: row.amount,
    odometer: row.odometer,
    at: row.at.slice(0, 10),
    note: row.note,
  }));
}

export function libraryIssueRows(
  issues: Array<{
    title: string;
    memberNo: string;
    issuedAt: Date | string;
    dueOn: Date | string;
    returnedAt: Date | string | null;
    fine: string | number;
  }>,
) {
  return issues.map((row) => ({
    title: row.title,
    memberNo: row.memberNo,
    issuedAt:
      typeof row.issuedAt === "string"
        ? row.issuedAt.slice(0, 10)
        : row.issuedAt.toISOString().slice(0, 10),
    dueOn:
      typeof row.dueOn === "string"
        ? row.dueOn.slice(0, 10)
        : row.dueOn.toISOString().slice(0, 10),
    returned: row.returnedAt ? "yes" : "no",
    fine: String(row.fine),
  }));
}

export function payrollSlipRows(
  slips: Array<{
    employeeId: string;
    name: string;
    year: number;
    month: number;
    gross: string | number;
    pf: string | number;
    esi: string | number;
    tds: string | number;
    net: string | number;
  }>,
) {
  return slips.map((row) => ({
    employeeId: row.employeeId,
    name: row.name,
    period: `${row.year}-${String(row.month).padStart(2, "0")}`,
    gross: String(row.gross),
    pf: String(row.pf),
    esi: String(row.esi),
    tds: String(row.tds),
    net: String(row.net),
  }));
}

export function visitorRows(
  rows: Array<{
    name: string;
    purpose: string | null;
    inAt: Date | string;
    outAt: Date | string | null;
  }>,
) {
  return rows.map((row) => ({
    name: row.name,
    purpose: row.purpose ?? "",
    inAt:
      typeof row.inAt === "string"
        ? row.inAt
        : row.inAt.toISOString(),
    outAt: row.outAt
      ? typeof row.outAt === "string"
        ? row.outAt
        : row.outAt.toISOString()
      : "",
  }));
}

export function resultSummaryRows(
  marks: Array<{
    exam: string;
    subject: string;
    marks: number | null;
    isAbsent: boolean;
  }>,
) {
  const grouped = new Map<
    string,
    {
      exam: string;
      subject: string;
      students: number;
      present: number;
      absent: number;
      total: number;
    }
  >();
  for (const row of marks) {
    const key = `${row.exam}\0${row.subject}`;
    const current = grouped.get(key) ?? {
      exam: row.exam,
      subject: row.subject,
      students: 0,
      present: 0,
      absent: 0,
      total: 0,
    };
    current.students += 1;
    if (row.isAbsent) current.absent += 1;
    else {
      current.present += 1;
      current.total += Number(row.marks ?? 0);
    }
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((row) => ({
      exam: row.exam,
      subject: row.subject,
      students: row.students,
      present: row.present,
      absent: row.absent,
      average: row.present ? Math.round((row.total / row.present) * 100) / 100 : 0,
    }))
    .sort((a, b) =>
      `${a.exam} ${a.subject}`.localeCompare(`${b.exam} ${b.subject}`),
    );
}

export function examAbsentRows(
  marks: Array<{
    student: string;
    exam: string;
    subject: string;
    isAbsent: boolean;
  }>,
) {
  return marks
    .filter((row) => row.isAbsent)
    .map((row) => ({
      student: row.student,
      exam: row.exam,
      subject: row.subject,
    }));
}

export function consolidatedPerformanceRows(
  marks: Array<{
    student: string;
    exam: string;
    marks: number | null;
    isAbsent: boolean;
  }>,
) {
  const grouped = new Map<
    string,
    {
      student: string;
      exam: string;
      total: number;
      count: number;
      absences: number;
    }
  >();
  for (const row of marks) {
    const key = `${row.student}\0${row.exam}`;
    const current = grouped.get(key) ?? {
      student: row.student,
      exam: row.exam,
      total: 0,
      count: 0,
      absences: 0,
    };
    if (row.isAbsent) current.absences += 1;
    else {
      current.total += Number(row.marks ?? 0);
      current.count += 1;
    }
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((row) => ({
      student: row.student,
      exam: row.exam,
      total: row.total,
      count: row.count,
      average: row.count ? Math.round((row.total / row.count) * 100) / 100 : 0,
      absences: row.absences,
    }))
    .sort((a, b) =>
      `${a.student} ${a.exam}`.localeCompare(`${b.student} ${b.exam}`),
    );
}

export function storeOrderRows(
  orders: Array<{
    studentId: string;
    itemId: string;
    qty: number;
    amount: number;
    source: string;
    status: string;
  }>,
) {
  return orders.map((row) => ({
    studentId: row.studentId,
    itemId: row.itemId,
    qty: row.qty,
    amount: row.amount,
    source: row.source,
    status: row.status,
  }));
}
