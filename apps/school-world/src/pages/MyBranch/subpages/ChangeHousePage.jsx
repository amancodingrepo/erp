import React from "react";
import { Building2 } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ChangeHousePage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Change House" description="Change Student's House." Icon={Building2} />;
}
