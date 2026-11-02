import React from "react";
import { Star } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageLeaveMarksPercentagePage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Manage Marks Percentage for Leave Type" description="Define how much percentage of marks can be considered if student is on leave in exam time." Icon={Star} />;
}
