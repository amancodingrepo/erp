import React from "react";
import { ClipboardList } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function UpdateRollNumbersPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Update Roll Numbers" description="Add roll numbers or update existing one." Icon={ClipboardList} />;
}
