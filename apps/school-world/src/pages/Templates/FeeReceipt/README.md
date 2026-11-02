# Fee Receipt

`feeReceiptPdf.js` owns the receipt-specific PDF generation, logo conversion, date/money formatting, and PDF byte helpers. `Students/StudentEditPage.jsx` calls this module when a receipt is downloaded or printed after payment.

The renderer uses the receipt payload's school profile and assigned `feeReceiptTemplate.receiptSettings`. Keep logo, school name/address/email/phone, optional student/payment fields, header/footer, and page orientation driven by that configuration. This folder must not own payment persistence or add database columns.

## School-specific policy notes

Policy notes are stored in the normalized `fee_receipt_template_notes` table as individual rows keyed by `school_id` and `template_id`. The Super Admin assignment view edits the note text and order for each school independently. Do not move these notes into `footer_text`, JSON, or JSONB.

Migration `007_fee_receipt_template_notes.sql` is registered in `server/migrate.js`, but it must be explicitly run against an approved database before notes can be saved. Receipt generation gracefully omits policy notes when the table is unavailable. Both the PDF generator and browser-print renderer read `feeReceiptTemplate.receiptNotes`.
