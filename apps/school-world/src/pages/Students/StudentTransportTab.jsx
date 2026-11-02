import React from "react";
import { Save } from "lucide-react";
import { Field } from "./StudentFormFields.jsx";

export default function StudentTransportTab({ context }) {
  const { t, data, update, saving, save } = context;
  return (
    <>

          <div className="simple-module-form"><Field label="In Route" value={data.inRoute} onChange={v => update("inRoute", v)} options={["--Select Route--", "Route 1", "Route 2", "Route 3"]}/><Field label="In Route Stop" value={data.inRouteStop} onChange={v => update("inRouteStop", v)} options={["--Select In Route Stop--", "Main Road", "School Gate", "Bus Stop A", "Bus Stop B"]}/><Field label="Out Route" value={data.outRoute} onChange={v => update("outRoute", v)} options={["--Select Route--", "Route 1", "Route 2", "Route 3"]}/><Field label="Out Route Stop" value={data.outRouteStop} onChange={v => update("outRouteStop", v)} options={["--Select Out Route Stop--", "Main Road", "School Gate", "Bus Stop A", "Bus Stop B"]}/></div>
          <div className="legacy-tab-footer"><button type="button" className="legacy-save" disabled={saving} onClick={() => save("Transport")}><Save size={15}/>{t(saving ? "Saving…" : "Save")}</button></div>
        
    </>
  );
}
