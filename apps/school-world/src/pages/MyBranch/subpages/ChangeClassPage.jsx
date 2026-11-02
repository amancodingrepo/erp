import React from "react";
import { Users } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ChangeClassPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Change Class" description="Change student classes." Icon={Users} />;
}
