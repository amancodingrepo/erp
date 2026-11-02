import React from "react";
import { UserCircle } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManagePrincipalDetailsPage(props) {
  return <MyBranchFeatureShell {...props} group="Administrative" title="Manage Principal Details" description="Assign grades to Principal and add Principal signature." Icon={UserCircle} />;
}
