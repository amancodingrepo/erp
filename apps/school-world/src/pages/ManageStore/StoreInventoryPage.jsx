import React from "react";
import downloadModuleCsv from "../../downloadModuleCsv.js";
import useModuleDataField from "../../useModuleDataField.js";

const initialInventory = [
  { name: "Exercise Book", code: "ST-001", stock: 150, minimum: 30 },
  { name: "School Diary", code: "ST-002", stock: 85, minimum: 20 },
  { name: "ID Card Holder", code: "ST-003", stock: 42, minimum: 15 },
  { name: "Uniform Tie", code: "ST-004", stock: 18, minimum: 20 }
];

export default function StoreInventoryPage({ t }) {
  const [inventory, setInventory] = useModuleDataField("Manage Store", "inventory", initialInventory);
  return <section className="module-card"><div className="module-card-title"><h2>{t("Store inventory")}</h2><button type="button" className="module-secondary-button" onClick={()=>downloadModuleCsv("school-store-demo.csv",[["Item","Code","Stock","Minimum Stock"],...inventory.map(item=>[item.name,item.code,item.stock,item.minimum])])}>{t("Export Inventory")}</button></div><div className="module-table-wrap"><table className="module-table"><thead><tr><th>{t("Item")}</th><th>{t("Item code")}</th><th>{t("Current stock")}</th><th>{t("Minimum stock")}</th><th>{t("Availability")}</th><th>{t("Adjust stock")}</th></tr></thead><tbody>{inventory.map(item=><tr key={item.code}><td><strong>{item.name}</strong></td><td>{item.code}</td><td>{item.stock}</td><td>{item.minimum}</td><td><span className={`module-status ${item.stock<item.minimum?"defaulter":"active"}`}>{t(item.stock<item.minimum?"Low stock":"In stock")}</span></td><td><div className="module-stock-controls"><button type="button" onClick={()=>setInventory(prev=>prev.map(row=>row.code===item.code?{...row,stock:Math.max(0,row.stock-1)}:row))} aria-label={`Decrease ${item.name} stock`}>−</button><button type="button" onClick={()=>setInventory(prev=>prev.map(row=>row.code===item.code?{...row,stock:row.stock+1}:row))} aria-label={`Increase ${item.name} stock`}>+</button></div></td></tr>)}</tbody></table></div></section>;
}
