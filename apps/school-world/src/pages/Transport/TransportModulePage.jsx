import React, { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../../api.js";

export default function TransportModulePage({ notify, t }) {
  const [routeDraft, setRouteDraft] = useState({ name: "", stops: "", vehicle: "", driver: "" });
  const [routes, setRoutes] = useState([
    { name: "Route 01", stops: "Vijay Nagar · Palasia", vehicle: "MP09-AB-1001", driver: "R. Singh" },
    { name: "Route 02", stops: "Bhawarkua · Rajendra Nagar", vehicle: "MP09-AB-1002", driver: "S. Verma" }
  ]);

  useEffect(() => {
    let cancelled = false;
    apiGet("/transport/routes").then(result => {
      if (!cancelled) setRoutes(Array.isArray(result.routes) ? result.routes : []);
    }).catch(error => { if (!cancelled) notify("Routes could not be loaded: " + error.message); });
    return () => { cancelled = true; };
  }, [notify]);

  async function addRoute() {
    if (!routeDraft.name.trim()) { notify("Enter a route name first."); return; }
    try {
      const result = await apiPost("/transport/routes", { name:routeDraft.name.trim(), stops:routeDraft.stops.trim()||"Not set", vehicle:routeDraft.vehicle.trim()||"Not set", driver:routeDraft.driver.trim()||"Not set" });
      setRoutes(previous => [...previous.filter(route => route.name !== result.route.name), result.route].sort((a,b) => a.name.localeCompare(b.name)));
      setRouteDraft({ name:"",stops:"",vehicle:"",driver:"" });
      notify("Transport route saved to the school database.");
    } catch(error) { notify("Route could not be saved: " + error.message); }
  }
  async function removeRoute(route) {
    try {
      await apiDelete("/transport/routes/" + encodeURIComponent(route.name));
      setRoutes(previous => previous.filter(item => item.name !== route.name));
      notify("Route removed from the school database.");
    } catch(error) { notify("Route could not be removed: " + error.message); }
  }

  return <><section className="module-card"><h2>{t("Add transport route")}</h2><div className="module-form-grid"><label>{t("Route name")}<input value={routeDraft.name} onChange={e=>setRouteDraft(prev=>({...prev,name:e.target.value}))} placeholder={t("Route 03")}/></label><label>{t("Stops")}<input value={routeDraft.stops} onChange={e=>setRouteDraft(prev=>({...prev,stops:e.target.value}))} placeholder={t("Enter stops")}/></label><label>{t("Vehicle number")}<input value={routeDraft.vehicle} onChange={e=>setRouteDraft(prev=>({...prev,vehicle:e.target.value}))} placeholder={t("MP09-AB-1003")}/></label><label>{t("Driver name")}<input value={routeDraft.driver} onChange={e=>setRouteDraft(prev=>({...prev,driver:e.target.value}))} placeholder={t("Driver name")}/></label></div><div className="module-actions-row"><button type="button" className="module-primary-button" onClick={addRoute}>{t("Add Route")}</button></div></section><section className="module-card"><div className="module-card-title"><h2>{t("Transport routes")}</h2><span>{routes.length} {t("routes")}</span></div><div className="module-table-wrap"><table className="module-table"><thead><tr><th>{t("Route")}</th><th>{t("Stops")}</th><th>{t("Vehicle")}</th><th>{t("Driver")}</th><th>{t("Action")}</th></tr></thead><tbody>{routes.map(route=><tr key={route.name}><td><strong>{route.name}</strong></td><td>{route.stops}</td><td>{route.vehicle}</td><td>{route.driver}</td><td><button type="button" className="module-small-button" onClick={()=>removeRoute(route)}>{t("Remove")}</button></td></tr>)}</tbody></table></div></section></>;
}
