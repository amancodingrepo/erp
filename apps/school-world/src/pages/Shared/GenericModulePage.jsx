import React from "react";

export default function GenericModulePage({ moduleName, t, notify }) {
  return <section className="module-card"><h2>{t(`${moduleName} overview`)}</h2><p>{t("This module is part of your school workspace. Records are stored by the school database service.")}</p><div className="module-actions-row"><button className="module-primary-button" type="button" onClick={() => notify(`${moduleName} opened in demo mode.`)}>{t("Open module")}</button></div></section>;
}
