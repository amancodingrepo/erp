import React from "react";
import { Bus } from "lucide-react";
import { AdmitField, AdmitYesNo, AdmitSectionHeading } from "./AdmitStudentFields.jsx";

export default function AdmitStudentTransportTab({ transport, setTransportField, routes = [] }) {
  const selectedRoute = routes.find(item => (typeof item === "string" ? item : item.name) === transport.routeName);
  const routeStops = typeof selectedRoute === "object" && selectedRoute
    ? String(selectedRoute.stops || "").split(/[,;\n]/).map(value => value.trim()).filter(Boolean) : [];
  return <section className="admit-tab-panel">
    <AdmitSectionHeading title="Transport" description="Choose the school route and pickup or drop-off arrangements." />
    <div className="admit-form-grid two">
      <AdmitYesNo label="Requires School Transport" value={transport.enabled || "No"} onChange={value => setTransportField("enabled", value)} />
      {routes.length
        ? <AdmitField label="Route Name / Bus Number" value={transport.routeName || ""} options={routes.map(item => ({
            value: typeof item === "string" ? item : item.name,
            label: typeof item === "string" ? item : item.name + (item.vehicle ? " · " + item.vehicle : "")
          }))} onChange={value => setTransportField("routeName", value)} />
        : <AdmitField label="Route Name / Bus Number" value={transport.routeName || ""} onChange={value => setTransportField("routeName", value)} />}
      {routeStops.length
        ? <AdmitField label="Pickup Stop" value={transport.pickupStop || ""} options={routeStops} onChange={value => setTransportField("pickupStop", value)} />
        : <AdmitField label="Pickup Stop" value={transport.pickupStop || ""} onChange={value => setTransportField("pickupStop", value)} />}
      {routeStops.length
        ? <AdmitField label="Drop-off Stop" value={transport.dropStop || ""} options={routeStops} onChange={value => setTransportField("dropStop", value)} />
        : <AdmitField label="Drop-off Stop" value={transport.dropStop || ""} onChange={value => setTransportField("dropStop", value)} />}
      <AdmitField label="Vehicle Number" value={transport.vehicleNumber || (typeof selectedRoute === "object" && selectedRoute ? selectedRoute.vehicle : "")} onChange={value => setTransportField("vehicleNumber", value)} />
      <AdmitField label="Transport Start Date" type="date" value={transport.startDate || ""} onChange={value => setTransportField("startDate", value)} />
      <AdmitField label="Journey Type" value={transport.journeyType || "Both Ways"} options={["Both Ways", "Pickup Only", "Drop-off Only"]} onChange={value => setTransportField("journeyType", value)} />
      <AdmitField label="Transport Notes" value={transport.notes || ""} onChange={value => setTransportField("notes", value)} />
    </div>
    {!routes.length && <div className="admit-tab-information"><Bus size={17} /><span>No active routes are configured yet. Add a route from My Branch → Manage Routes.</span></div>}
  </section>;
}
