export function pdfSafeText(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g,'-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7e]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
}
export function receiptDateLabel(value) {
  const match=String(value || '').slice(0,10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!match)return String(value || '—');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return match[3]+'-'+months[Number(match[2])-1]+'-'+match[1];
}
export function receiptMoney(value) {
  return Number(value || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
export function receiptAsciiBytes(value) {
  const text=String(value);
  const bytes=new Uint8Array(text.length);
  for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i)&255;
  return bytes;
}
export function receiptConcatBytes(parts) {
  const length=parts.reduce((sum,part)=>sum+part.length,0);
  const output=new Uint8Array(length);let offset=0;
  for(const part of parts){output.set(part,offset);offset+=part.length;}
  return output;
}
export async function receiptLogoAsJpeg(logoSource) {
  const source=String(logoSource || '').trim();
  if(!source)return null;
  let objectUrl='';
  try {
    const resolvedSource=/^(data:|blob:)/i.test(source)?source:new URL(source,window.location.origin).href;
    const response=await fetch(resolvedSource,{credentials:'include'});
    if(!response.ok)throw new Error('The configured school logo could not be loaded.');
    const blob=await response.blob();
    objectUrl=URL.createObjectURL(blob);
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Unsupported school logo image.'));image.src=objectUrl;});
    const ratio=Math.min(480/image.naturalWidth,300/image.naturalHeight,1);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const context=canvas.getContext('2d');if(!context)return null;
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    const binary=atob(canvas.toDataURL('image/jpeg',0.92).split(',')[1]);
    const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return {bytes,width:canvas.width,height:canvas.height};
  } catch { return null; }
  finally { if(objectUrl)URL.revokeObjectURL(objectUrl); }
}
export function buildFeeReceiptPdf(receipt, logoImage) {
  const templateSettings = receipt?.feeReceiptTemplate?.receiptSettings || {};
  const showSetting = (key, fallback = true) => {
    const value = templateSettings[key];
    if (value === undefined || value === null) return fallback;
    return value === true || value === 1 || String(value).toLowerCase() === 'true';
  };
  const landscape = String(templateSettings.pageOrientation || 'portrait').toLowerCase() === 'landscape';
  const pageWidth = landscape ? 842 : 595;
  const pageHeight = landscape ? 595 : 842;
  const marginX = 30;
  const marginTop = 28;
  const contentX = 38;
  const contentWidth = pageWidth - 76;
  const contentRight = contentX + contentWidth;
  const showSchoolLogo = showSetting('showSchoolLogo', true);
  const visibleLogo = showSchoolLogo ? logoImage : null;
  const showSchoolName = showSetting('showSchoolName', true);
  const showSchoolAddress = showSetting('showSchoolAddress', true);
  const showSchoolPhone = showSetting('showSchoolPhone', true);
  const showSchoolEmail = showSetting('showSchoolEmail', true);
  const showStudentName = showSetting('showStudentName', true);
  const showStudentCode = showSetting('showStudentCode', true);
  const showClassSection = showSetting('showClassSection', true);
  const showAcademicYear = showSetting('showAcademicYear', true);
  const showParentName = showSetting('showParentName', true);
  const showFeeBreakdown = showSetting('showFeeBreakdown', true);
  const showPaymentMethod = showSetting('showPaymentMethod', true);
  const showReceiptNumber = showSetting('showReceiptNumber', true);
  const showPaymentReference = showSetting('showPaymentReference', false);
  const showPaidAmount = showSetting('showPaidAmount', true);
  const showBalance = showSetting('showBalance', false);
  const showSignatureLine = showSetting('showSignatureLine', false);
  const headingText = String(templateSettings.headerText || 'FEE RECEIPT').trim();
  const footerText = String(templateSettings.footerText || '').trim();
  const schoolReceiptNotes = (Array.isArray(receipt?.feeReceiptTemplate?.receiptNotes) ? receipt.feeReceiptTemplate.receiptNotes : [])
    .map(note => String(typeof note === 'string' ? note : note?.noteText ?? note?.text ?? '').trim())
    .filter(Boolean);

  const wrap = (value, maxChars) => {
    const string = String(value ?? '').trim();
    if (!string) return ['—'];
    const lines = [];
    let current = '';
    for (const word of string.split(/\s+/)) {
      const candidate = current ? current + ' ' + word : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  };
  const rows = (Array.isArray(receipt?.records) ? receipt.records : []).map(item => ({
    installment: item.installment || '—',
    name: item.feeName || 'Fee',
    amount: Number(item.amountPaidThisReceipt ?? item.amountPaid ?? 0)
  })).filter(item => Number.isFinite(item.amount) && item.amount > 0);
  const total = Number(receipt?.totalPaid ?? rows.reduce((sum, item) => sum + item.amount, 0));
  const outstandingBalance = (Array.isArray(receipt?.records) ? receipt.records : []).reduce((sum, item) => {
    return sum + Math.max(0, Number(item.amount || 0) - Number(item.amountPaid || 0));
  }, 0);
  const schoolName = String(receipt?.school?.name || '').trim();
  const schoolAddress = String(receipt?.school?.address || '').trim();
  const schoolEmail = String(receipt?.school?.email || '').trim();
  const schoolPhone = String(receipt?.school?.phone || '').trim();
  const logoVisible = Boolean(visibleLogo);
  const headerTextX = logoVisible ? 140 : contentX + 4;
  const headerLines = [];
  const schoolInfoMaxChars = landscape ? 105 : 74;
  if (showSchoolAddress && schoolAddress) headerLines.push(...wrap(schoolAddress, schoolInfoMaxChars).slice(0, 2));
  if (showSchoolEmail && schoolEmail) headerLines.push(...wrap('E-mail: ' + schoolEmail, landscape ? 100 : 70).slice(0, 2));
  if (showSchoolPhone && schoolPhone) headerLines.push(...wrap('Contact: ' + schoolPhone, landscape ? 100 : 70).slice(0, 2));
  let headerInfoTop = showSchoolName && schoolName ? 66 : 45;
  const headerBottom = Math.max((logoVisible || (showSchoolName && schoolName)) ? 121 : 88, headerInfoTop + headerLines.length * 11 + 3);
  const receiptMetaTop = headerBottom + 9;
  const detailTop = headerBottom + 50;
  const details = [];
  const addDetail = (label, value) => {
    const normalized = String(value ?? '').trim();
    if (normalized) details.push([label, normalized]);
  };
  if (showStudentName) addDetail('Student Name', receipt?.student?.name);
  if (showParentName) {
    addDetail('Mother Name', receipt?.student?.motherName);
    addDetail('Father Name', receipt?.student?.fatherName);
    addDetail('Parent / Guardian', receipt?.student?.parentName);
  }
  if (showClassSection) addDetail('Class', [receipt?.student?.className, receipt?.student?.section].filter(Boolean).join(' '));
  if (showStudentCode) addDetail('Student ID', receipt?.student?.id);
  addDetail('Paid Date', receiptDateLabel(receipt?.paymentDate || receipt?.receiptDate));
  addDetail('Notes', receipt?.notes);
  const detailValueChars = landscape ? 84 : 60;
  const detailsWithLayout = details.map(([label, value]) => {
    const lines = wrap(value, label === 'Notes' ? (landscape ? 110 : 67) : detailValueChars);
    const shownLines = lines.slice(0, label === 'Notes' ? 3 : 2);
    const height = Math.max(23, Math.min(label === 'Notes' ? 42 : 34, shownLines.length * 12 + 8));
    return { label, lines: shownLines, height };
  });
  const estimatedDetailHeight = detailsWithLayout.reduce((sum, item) => sum + item.height, 0);
  const estimatedTableTop = detailTop + estimatedDetailHeight + 14;
  const tableHeaderHeight = 24;
  const tableRowHeight = 21;
  const schoolReceiptNoteLines = schoolReceiptNotes.map(note => wrap(note, landscape ? 100 : 58));
  const estimatedPolicyNotesHeight = schoolReceiptNoteLines.reduce((height, lines) => height + lines.length * 13 + 4, schoolReceiptNotes.length ? 26 : 0);
  const endingReserve = 165 + estimatedPolicyNotesHeight;
  const firstPageCapacity = Math.max(1, Math.floor((pageHeight - marginTop - 18 - estimatedTableTop - tableHeaderHeight - endingReserve) / tableRowHeight));
  const continuationCapacity = Math.max(1, Math.floor((pageHeight - marginTop - 108 - tableHeaderHeight - endingReserve) / tableRowHeight));
  const chunks = [];
  if (!showFeeBreakdown) {
    chunks.push([]);
  } else if (rows.length <= firstPageCapacity) {
    chunks.push(rows);
  } else {
    chunks.push(rows.slice(0, firstPageCapacity));
    for (let start = firstPageCapacity; start < rows.length; start += continuationCapacity) {
      chunks.push(rows.slice(start, start + continuationCapacity));
    }
  }
  const objects = new Map();
  let nextObject = 1;
  const ids = { catalog: nextObject++, pages: nextObject++, regular: nextObject++, bold: nextObject++ };
  const logoId = logoVisible ? nextObject++ : null;
  const text = (value, x, top, size, bold = false) => {
    const y = pageHeight - top - size;
    return 'BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf 1 0 0 1 ' + x + ' ' + y + ' Tm (' + pdfSafeText(value) + ') Tj ET\n';
  };
  const centeredText = (value, top, size, bold = false) => {
    const string = String(value ?? '');
    const estimatedWidth = string.length * size * 0.52;
    return text(string, Math.max(38, (pageWidth - estimatedWidth) / 2), top, size, bold);
  };
  const centeredInRegionText = (value, regionX, regionWidth, top, size, bold = false) => {
    const string = String(value ?? '');
    const estimatedWidth = string.length * size * 0.52;
    const x = regionX + Math.max(0, (regionWidth - estimatedWidth) / 2);
    return text(string, x, top, size, bold);
  };
  const line = (x1, top1, x2, top2) => '0.28 G 0.55 w ' + x1 + ' ' + (pageHeight - top1) + ' m ' + x2 + ' ' + (pageHeight - top2) + ' l S\n';
  const rect = (x, top, width, height) => '0.28 G 0.55 w ' + x + ' ' + (pageHeight - top - height) + ' ' + width + ' ' + height + ' re S\n';
  objects.set(ids.catalog, receiptAsciiBytes('<< /Type /Catalog /Pages ' + ids.pages + ' 0 R >>'));
  const pageIds = [];
  const contentIds = [];
  for (let index = 0; index < chunks.length; index++) {
    contentIds.push(nextObject++);
    pageIds.push(nextObject++);
  }
  objects.set(ids.pages, receiptAsciiBytes('<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pageIds.length + ' >>'));
  objects.set(ids.regular, receiptAsciiBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  objects.set(ids.bold, receiptAsciiBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  if (logoVisible) objects.set(logoId, receiptConcatBytes([
    receiptAsciiBytes('<< /Type /XObject /Subtype /Image /Width ' + visibleLogo.width + ' /Height ' + visibleLogo.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + visibleLogo.bytes.length + ' >>\nstream\n'),
    visibleLogo.bytes,
    receiptAsciiBytes('\nendstream')
  ]));
  for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
    let ops = rect(marginX, marginTop, pageWidth - marginX * 2, pageHeight - marginTop * 2);
    const currentRows = chunks[pageIndex];
    let tableTop;
    if (pageIndex === 0) {
      if (logoVisible) {
        const ratio = Math.min(78 / visibleLogo.width, 64 / visibleLogo.height);
        const w = visibleLogo.width * ratio;
        const h = visibleLogo.height * ratio;
        ops += 'q ' + w.toFixed(2) + ' 0 0 ' + h.toFixed(2) + ' 43 ' + (pageHeight - 43 - h).toFixed(2) + ' cm /Im1 Do Q\n';
      }
      const headerInfoWidth = contentRight - headerTextX;
      if (showSchoolName && schoolName) ops += centeredInRegionText(schoolName, headerTextX, headerInfoWidth, 43, 17, true);
      headerLines.forEach(value => {
        ops += centeredInRegionText(value, headerTextX, headerInfoWidth, headerInfoTop, 9, false);
        headerInfoTop += 11;
      });
      ops += line(contentX, headerBottom, contentRight, headerBottom);
      if (showReceiptNumber && receipt?.receiptNumber) ops += text('Receipt Number: ' + receipt.receiptNumber, contentX + 4, receiptMetaTop, 10, false);
      ops += centeredText(headingText, headerBottom + 7, 16, true);
      ops += text('Date: ' + receiptDateLabel(receipt?.receiptDate), Math.max(contentX + 4, contentRight - 125), receiptMetaTop, 10, false);
      if (showAcademicYear) {
        const year = receipt?.student?.academicYear || currentRows[0]?.academicYear || '';
        if (year) ops += centeredText('(' + year + ')', headerBottom + 29, 12, true);
      }
      const detailX = contentX;
      const detailWidth = contentWidth;
      const labelWidth = Math.min(132, Math.round(detailWidth * 0.27));
      let top = detailTop;
      detailsWithLayout.forEach(item => {
        ops += rect(detailX, top, detailWidth, item.height) + line(detailX + labelWidth, top, detailX + labelWidth, top + item.height) + text(item.label, detailX + 7, top + 6, 10, false);
        item.lines.forEach((entry, index) => {
          ops += text(entry, detailX + labelWidth + 7, top + 6 + index * 12, 10, false);
        });
        top += item.height;
      });
      tableTop = top + 14;
    } else {
      if (showSchoolName && schoolName) ops += text(schoolName, contentX + 4, 44, 14, true);
      if (showReceiptNumber && receipt?.receiptNumber) ops += text('Receipt Number: ' + receipt.receiptNumber, contentX + 4, 66, 10, false);
      ops += text(headingText + ' - CONTINUED', contentX + 4, 86, 12, true);
      tableTop = 108;
    }
    const tableX = contentX;
    const tableWidth = contentWidth;
    const c1 = tableX + tableWidth * 0.31;
    const c2 = tableX + tableWidth * 0.77;
    let top = tableTop;
    if (showFeeBreakdown) {
      ops += rect(tableX, tableTop, tableWidth, tableHeaderHeight) + line(c1, tableTop, c1, tableTop + tableHeaderHeight) + line(c2, tableTop, c2, tableTop + tableHeaderHeight);
      ops += text('Installment', tableX + 7, tableTop + 6, 10, true) + text('Type of Fees', c1 + 7, tableTop + 6, 10, true) + text('Amount', c2 + 7, tableTop + 6, 10, true);
      top += tableHeaderHeight;
      currentRows.forEach(item => {
        ops += rect(tableX, top, tableWidth, tableRowHeight) + line(c1, top, c1, top + tableRowHeight) + line(c2, top, c2, top + tableRowHeight);
        ops += text(wrap(item.installment, Math.max(12, Math.floor((c1 - tableX - 14) / 5.2)))[0], tableX + 7, top + 5, 9, false);
        ops += text(wrap(item.name, Math.max(18, Math.floor((c2 - c1 - 14) / 4.7)))[0], c1 + 7, top + 5, 9, false);
        ops += text(receiptMoney(item.amount), c2 + 7, top + 5, 9, false);
        top += tableRowHeight;
      });
    }
    const isLastPage = pageIndex === chunks.length - 1;
    if (isLastPage) {
      const summaryItems = [];
      if (showPaidAmount) summaryItems.push(['Total Amount Received', 'INR ' + receiptMoney(total)]);
      if (showBalance) summaryItems.push(['Outstanding Balance', 'INR ' + receiptMoney(outstandingBalance)]);
      if (summaryItems.length) {
        top += 14;
        summaryItems.forEach(([label, value]) => {
          ops += rect(tableX, top, tableWidth, 31);
          ops += text(label, tableX + 9, top + 9, 11, true);
          ops += text(value, tableX + tableWidth - 142, top + 9, 11, true);
          top += 31;
        });
        top += 4;
      }
      if (showPaymentMethod) {
        ops += text('Payment Method: ' + String(receipt?.paymentMethod || 'Not recorded'), contentX + 4, top + 7, 9, false);
        top += 21;
      }
      if (showPaymentReference && String(receipt?.reference || '').trim()) {
        ops += text('Payment Reference: ' + String(receipt.reference).trim(), contentX + 4, top + 3, 9, false);
        top += 17;
      }
      if (schoolReceiptNotes.length) {
        top += 6;
        ops += text('Notes', contentX + 4, top, 12, true);
        top += 15;
        schoolReceiptNoteLines.forEach((noteLines, index) => {
          ops += text((index + 1) + '.', contentX + 4, top, 10, true);
          noteLines.forEach((value, lineIndex) => {
            ops += text(value, contentX + 22, top + lineIndex * 13, 10, false);
          });
          top += noteLines.length * 13 + 4;
        });
        top += 4;
      }
      if (showSignatureLine) {
        const signatureTop = pageHeight - 66 - (footerText ? 12 : 0);
        ops += line(contentX + tableWidth * 0.67, signatureTop, contentRight - 2, signatureTop);
        ops += text('Authorized Signature', contentRight - 115, signatureTop + 4, 8, false);
      }
      if (footerText) {
        const footerLines = wrap(footerText, landscape ? 125 : 88).slice(0, 2);
        const footerTop = pageHeight - 27 - footerLines.length * 10;
        footerLines.forEach((value, index) => {
          ops += text(value, contentX + 4, footerTop + index * 10, 8, false);
        });
      }
    } else {
      ops += text('Continued on next page', Math.max(contentX, contentRight - 130), Math.min(pageHeight - 45, top + 12), 8, false);
    }
    const contentId = contentIds[pageIndex];
    const pageId = pageIds[pageIndex];
    const stream = receiptAsciiBytes(ops);
    objects.set(contentId, receiptConcatBytes([receiptAsciiBytes('<< /Length ' + stream.length + ' >>\nstream\n'), stream, receiptAsciiBytes('\nendstream')]));
    const xobjects = logoVisible ? '/XObject << /Im1 ' + logoId + ' 0 R >>' : '';
    objects.set(pageId, receiptAsciiBytes('<< /Type /Page /Parent ' + ids.pages + ' 0 R /MediaBox [0 0 ' + pageWidth + ' ' + pageHeight + '] /Resources << /Font << /F1 ' + ids.regular + ' 0 R /F2 ' + ids.bold + ' 0 R >> ' + xobjects + ' >> /Contents ' + contentId + ' 0 R >>'));
  }
  const parts = [receiptAsciiBytes('%PDF-1.4\n%PDFDATA\n')];
  const offsets = [0];
  let offset = parts[0].length;
  for (let id = 1; id < nextObject; id++) {
    const body = objects.get(id);
    if (!body) throw new Error('Fee receipt PDF is missing object ' + id);
    offsets[id] = offset;
    const begin = receiptAsciiBytes(id + ' 0 obj\n');
    const end = receiptAsciiBytes('\nendobj\n');
    parts.push(begin, body, end);
    offset += begin.length + body.length + end.length;
  }
  const xrefOffset = offset;
  let xref = 'xref\n0 ' + nextObject + '\n0000000000 65535 f \n';
  for (let id = 1; id < nextObject; id++) xref += String(offsets[id]).padStart(10, '0') + ' 00000 n \n';
  parts.push(receiptAsciiBytes(xref + 'trailer\n<< /Size ' + nextObject + ' /Root ' + ids.catalog + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF'));
  return new Blob([receiptConcatBytes(parts)], { type: 'application/pdf' });
}
