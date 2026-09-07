import { LiveClassProvider } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound, validationError } from "@/lib/errors";
import { liveMeetingUrl, liveRecordingUrl } from "@/lib/live-class-url";

export async function createLiveClass(
  campusId: string,
  input: {
    provider: LiveClassProvider;
    title: string;
    meetingUrl: string;
    recordingUrl?: string;
    startsAt: string;
    classId?: string;
    subjectId?: string;
    staffId?: string;
  },
) {
  const title = input.title.trim();
  if (!title) throw validationError({ title: "required" });
  const meetingUrl = liveMeetingUrl(input.meetingUrl);
  if (!meetingUrl) {
    throw validationError({ meetingUrl: "https Meet or Zoom URL required" });
  }
  const recording = liveRecordingUrl(input.recordingUrl);
  if (recording === null) {
    throw validationError({ recordingUrl: "https recording URL required" });
  }
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw validationError({ startsAt: "invalid" });
  }
  if (input.classId) {
    const klass = await prisma.class.findFirst({
      where: { id: input.classId, program: { department: { campusId } } },
    });
    if (!klass) throw notFound("class");
  }
  if (input.subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: input.subjectId, campusId },
    });
    if (!subject) throw notFound("subject");
  }
  if (input.staffId) {
    const staff = await prisma.staff.findFirst({
      where: { id: input.staffId, campusId },
    });
    if (!staff) throw notFound("staff");
  }
  return prisma.liveClass.create({
    data: {
      campusId,
      provider: input.provider,
      title,
      meetingUrl,
      recordingUrl: recording,
      startsAt,
      classId: input.classId,
      subjectId: input.subjectId,
      staffId: input.staffId,
    },
  });
}

export async function listLiveClasses(
  campusId: string,
  provider?: LiveClassProvider,
) {
  return prisma.liveClass.findMany({
    where: { campusId, ...(provider ? { provider } : {}) },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      staff: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startsAt: "desc" },
  });
}
