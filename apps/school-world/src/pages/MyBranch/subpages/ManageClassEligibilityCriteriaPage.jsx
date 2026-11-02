import React from "react";
import { ClipboardList } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageClassEligibilityCriteriaPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Manage Class Eligibility Criteria" description="Set eligibility criteria for grade like eligible range of student birthdates." Icon={ClipboardList} />;
}
