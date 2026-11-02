import React from "react";
import { Building2 } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageHousePage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Manage House" description="Add new house or edit existing ones for your branch." Icon={Building2} />;
}
