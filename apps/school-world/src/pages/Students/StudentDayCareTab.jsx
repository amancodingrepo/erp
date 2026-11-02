import React from "react";
import { Save } from "lucide-react";
import { Field, YesNo } from "./StudentFormFields.jsx";

export default function StudentDayCareTab({ context }) {
  const { t, data, update, saving, save } = context;
  return (
    <>

          <div className="simple-module-form"><YesNo label="Day Care" value={data.dayCare} onChange={v => update("dayCare", v)}/><Field label="Check In Time" value={data.checkInTime} onChange={v => update("checkInTime", v)} type="time"/><Field label="Check Out Time" value={data.checkOutTime} onChange={v => update("checkOutTime", v)} type="time"/><YesNo label="Allow CCTV" value={data.allowCCTV} onChange={v => update("allowCCTV", v)}/></div>
          <div className="legacy-tab-footer"><button type="button" className="legacy-save" disabled={saving} onClick={() => save("Day Care")}><Save size={15}/>{t(saving ? "Saving…" : "Save")}</button></div>
        
    </>
  );
}
