import React from "react";
import { UserCircle } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function PromoteToAlumniPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Promote to Alumni" description="Promote student to Alumni (Disable Student)." Icon={UserCircle} />;
}
