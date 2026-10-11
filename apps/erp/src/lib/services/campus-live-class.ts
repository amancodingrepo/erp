import { LiveClassProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { liveMeetingUrl, liveRecordingUrl } from "@/lib/live-class-url";
import { assertVirtualClassroom } from "@/lib/services/campus-comms";

function trim(value: unknown) {
  return String(value ?? "").trim();
}

const liveInclude = {
  class: { select: { name: true } },
  subject: { select: { name: true } },
  staff: { select: { firstName: true, lastName: true } },
} as const;

export function liveClassPatchData(
  existing: {
    title: string;
    meetingUrl: string;
    recordingUrl: string | null;
    startsAt: Date;
    provider: LiveClassProvider;
  },
  patch: {
    title?: string;
    meetingUrl?: string;
    recordingUrl?: string | null;
    startsAt?: string;
    provider?: LiveClassProvider;
  },
) {
  const title = patch.title !== undefined ? trim(patch.title) : existing.title;
  if (!title) throw validationError({ title: "required" });
  let meetingUrl = existing.meetingUrl;
  if (patch.meetingUrl !== undefined) {
    const next = liveMeetingUrl(patch.meetingUrl);
    if (!next) throw validationError({ meetingUrl: "https Meet or Zoom URL required" });
    meetingUrl = next;
  }
  let recordingUrl: string | null | undefined;
  if (patch.recordingUrl !== undefined) {
    if (!patch.recordingUrl) {
      recordingUrl = null;
    } else {
      const next = liveRecordingUrl(patch.recordingUrl);
      if (!next) throw validationError({ recordingUrl: "https recording URL required" });
      recordingUrl = next;
    }
  }
  let startsAt: Date | undefined;
  if (patch.startsAt !== undefined) {
    startsAt = new Date(patch.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw validationError({ startsAt: "invalid" });
  }
  return {
    title,
    meetingUrl,
    ...(recordingUrl !== undefined ? { recordingUrl } : {}),
    ...(startsAt !== undefined ? { startsAt } : {}),
    ...(patch.provider !== undefined ? { provider: patch.provider } : {}),
  };
}

export async function getLiveClass(campusId: string, id: string) {
  const row = await prisma.liveClass.findFirst({
    where: { id: trim(id), campusId },
    include: liveInclude,
  });
  if (!row) throw notFound("live class");
  return row;
}

export async function patchLiveClass(
  campusId: string,
  id: string,
  patch: {
    title?: string;
    meetingUrl?: string;
    recordingUrl?: string | null;
    startsAt?: string;
    provider?: LiveClassProvider;
    classId?: string | null;
    subjectId?: string | null;
    staffId?: string | null;
  },
) {
  const existing = await getLiveClass(campusId, id);
  const data = liveClassPatchData(existing, patch);
  let classId: string | null | undefined;
  if (patch.classId !== undefined) {
    if (!patch.classId) {
      classId = null;
    } else {
      const klass = await prisma.class.findFirst({
        where: { id: trim(patch.classId), program: { department: { campusId } } },
        select: { id: true },
      });
      if (!klass) throw notFound("class");
      await assertVirtualClassroom(campusId, klass.id);
      classId = klass.id;
    }
  }
  let subjectId: string | null | undefined;
  if (patch.subjectId !== undefined) {
    if (!patch.subjectId) {
      subjectId = null;
    } else {
      const subject = await prisma.subject.findFirst({
        where: { id: trim(patch.subjectId), campusId },
        select: { id: true },
      });
      if (!subject) throw notFound("subject");
      subjectId = subject.id;
    }
  }
  let staffId: string | null | undefined;
  if (patch.staffId !== undefined) {
    if (!patch.staffId) {
      staffId = null;
    } else {
      const staff = await prisma.staff.findFirst({
        where: { id: trim(patch.staffId), campusId },
        select: { id: true },
      });
      if (!staff) throw notFound("staff");
      staffId = staff.id;
    }
  }
  return prisma.liveClass.update({
    where: { id: existing.id },
    data: {
      ...data,
      ...(classId !== undefined ? { classId } : {}),
      ...(subjectId !== undefined ? { subjectId } : {}),
      ...(staffId !== undefined ? { staffId } : {}),
    },
    include: liveInclude,
  });
}

export async function removeLiveClass(campusId: string, id: string) {
  const existing = await getLiveClass(campusId, id);
  await prisma.liveClass.delete({ where: { id: existing.id } });
  return { id: existing.id, deleted: true };
}
