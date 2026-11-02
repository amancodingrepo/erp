import React, { useState } from "react";
import useModuleDataField from "../../useModuleDataField.js";

const initialVendors = [
  { name: "Central Stationers", contact: "Accounts Desk", phone: "0731-000-1001" },
  { name: "School Supplies Co.", contact: "Vendor Desk", phone: "0731-000-1002" }
];

export default function StoreVendorPage({ notify, t }) {
  const [vendors, setVendors] = useModuleDataField("Store Vendor", "vendors", initialVendors);
  const [vendorDraft, setVendorDraft] = useState({ name:"",contact:"",phone:"" });
  function addVendor() {
    if (!vendorDraft.name.trim()) { notify("Enter the vendor name first."); return; }
    setVendors(previous => [...previous, { name:vendorDraft.name.trim(), contact:vendorDraft.contact.trim()||"—", phone:vendorDraft.phone.trim()||"—" }]);
    setVendorDraft({name:"",contact:"",phone:""});
    notify("Vendor saved to the school database.");
  }
  return <><section className="module-card"><h2>{t("Add store vendor")}</h2><div className="module-form-grid"><label>{t("Vendor name")}<input value={vendorDraft.name} onChange={e=>setVendorDraft(prev=>({...prev,name:e.target.value}))} placeholder={t("Company or vendor name")}/></label><label>{t("Contact person")}<input value={vendorDraft.contact} onChange={e=>setVendorDraft(prev=>({...prev,contact:e.target.value}))} placeholder={t("Contact person")}/></label><label>{t("Phone number")}<input value={vendorDraft.phone} onChange={e=>setVendorDraft(prev=>({...prev,phone:e.target.value}))} placeholder={t("Vendor phone")}/></label></div><div className="module-actions-row"><button type="button" className="module-primary-button" onClick={addVendor}>{t("Add Vendor")}</button></div></section><section className="module-card"><h2>{t("Vendor directory")}</h2><div className="module-table-wrap"><table className="module-table"><thead><tr><th>{t("Vendor")}</th><th>{t("Contact person")}</th><th>{t("Phone")}</th><th>{t("Action")}</th></tr></thead><tbody>{vendors.map((vendor,index)=><tr key={`${vendor.name}-${index}`}><td><strong>{vendor.name}</strong></td><td>{vendor.contact}</td><td>{vendor.phone}</td><td><button type="button" className="module-small-button" onClick={()=>{setVendors(previous=>previous.filter((_,i)=>i!==index));notify("Vendor removed.");}}>{t("Remove")}</button></td></tr>)}</tbody></table></div></section></>;
}
