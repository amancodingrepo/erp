# Fee Structure Templates

`ManageFeeTemplatesPage.jsx` is the entry page registered in My Branch. It coordinates the fee template list, editor, installment dialog, and application workspace. `feeTemplateUtils.js` owns the local template and student-filtering helpers.

Keep the sibling components together so template structure editing and applying templates to student fee records are easy to trace. The implementation retains its existing API calls and behavior; moving it must not change fee/payment persistence.
