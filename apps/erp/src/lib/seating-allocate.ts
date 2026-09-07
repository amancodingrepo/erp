export type SeatBlock = { id: string; name: string; capacity: number };
export type SeatStudent = { id: string; roll?: string | null };

export function totalCapacity(blocks: SeatBlock[]) {
  return blocks.reduce((sum, b) => sum + Math.max(0, b.capacity), 0);
}

export function allocateSeats(students: SeatStudent[], blocks: SeatBlock[]) {
  const overflow = students.length - totalCapacity(blocks);
  if (overflow > 0) {
    return { ok: false as const, overflow, seats: [] as Array<{ studentId: string; blockId: string; seatNo: string }> };
  }
  const sorted = [...students].sort((a, b) => {
    const ra = a.roll ?? "";
    const rb = b.roll ?? "";
    if (ra && rb && ra !== rb) return ra.localeCompare(rb, undefined, { numeric: true });
    return a.id.localeCompare(b.id);
  });
  const seats: Array<{ studentId: string; blockId: string; seatNo: string }> = [];
  let i = 0;
  for (const block of blocks) {
    const cap = Math.max(0, block.capacity);
    for (let n = 1; n <= cap && i < sorted.length; n++) {
      seats.push({
        studentId: sorted[i].id,
        blockId: block.id,
        seatNo: `${block.name}-${String(n).padStart(2, "0")}`,
      });
      i += 1;
    }
  }
  return { ok: true as const, overflow: 0, seats };
}
