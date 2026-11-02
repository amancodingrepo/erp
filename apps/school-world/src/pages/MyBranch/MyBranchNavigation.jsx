import React from "react";
import { BookOpen, Building2, Users } from "lucide-react";
import { myBranchGroups } from "./myBranchConfig.js";
import { getNavigationHref, getModuleNavigationTarget, handleNavigationClick } from "../../navigation.js";

function navigationTargetForFeature(feature) {
  if (feature.action === "manage-parents-and-children") return { view: "manage", module: "My Branch" };
  if (feature.admission) return { view: "admission", module: "Admission/Enquiry Form" };
  if (feature.module) return getModuleNavigationTarget(feature.module, { parent: "My Branch" });
  if (feature.Page) return { module: "My Branch", branchPage: feature.title };
  return { module: "My Branch" };
}

export default function MyBranchNavigation({ onOpenFeature, t }) {
  function activateFeature(event, feature) {
    handleNavigationClick(event, () => {
      try { window.history.replaceState({}, "", getNavigationHref(navigationTargetForFeature(feature))); } catch {}
      onOpenFeature(feature);
    });
  }

  return (
    <div className="my-branch-dashboard">
      {myBranchGroups.map(group => {
        const GroupIcon = group.title === "Users" ? Users : group.title === "Academics" ? BookOpen : Building2;
        return <section className={`my-branch-column my-branch-group-${group.title.toLowerCase()}`} key={group.title}>
          <header className="my-branch-column-header">
            <div className="my-branch-group-icon"><GroupIcon size={22} strokeWidth={1.8}/></div>
            <div className="my-branch-group-heading">
              <h3>{t(group.title)}</h3>
              <span>{group.items.length} {group.items.length === 1 ? t("link") : t("links")}</span>
            </div>
          </header>
          <div className="my-branch-link-list">
            {group.items.map(item => {
              const Icon = item.Icon;
              const feature = { ...item, group: group.title };
              return <article className="my-branch-link-item" key={item.title}>
                <Icon className="my-branch-link-icon" size={15}/>
                <div className="my-branch-link-body">
                  <a href={getNavigationHref(navigationTargetForFeature(feature))} className="my-branch-link" onClick={event => activateFeature(event, feature)}>{t(item.title)}</a>
                  <p>{t(item.description)}</p>
                </div>
              </article>;
            })}
          </div>
        </section>;
      })}
    </div>
  );
}
