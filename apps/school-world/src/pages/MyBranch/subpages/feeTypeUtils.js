export const blankDraft = () => ({ id: "", name: "", refundable: false, visible: true, taxes: { cgst: false, sgst: false, igst: false } });
export const taxesFor = value => {
  const taxes = value || {};
  return [taxes.cgst && "CGST 9%", taxes.sgst && "SGST 9%", taxes.igst && "IGST 18%"].filter(Boolean);
};
export const makeId = () => "fee-type-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
