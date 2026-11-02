import React from "react";
import { Users } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function PromoteClassPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Promote Class" description="Promote students to the next class for next academic year." Icon={Users} />;
}
