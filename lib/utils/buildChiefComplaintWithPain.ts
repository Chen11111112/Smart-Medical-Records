export const buildChiefComplaintWithPain = (
  chiefComplaint: string | undefined | null,
  painAssessment: string | undefined | null
): string => {
  const complaint = String(chiefComplaint ?? '').trim();
  const pain = String(painAssessment ?? '').trim();
  if (!pain) return complaint;
  const painPart = `疼痛評估: ${pain}`;
  if (!complaint) return painPart;
  return `${complaint} ${painPart}`;
};
