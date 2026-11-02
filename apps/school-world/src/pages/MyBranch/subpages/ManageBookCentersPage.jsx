import React from "react";
import { BookOpen } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageBookCentersPage(props) {
  return <MyBranchFeatureShell {...props} group="Administrative" title="Manage Book Centers" description="Add or update library center." Icon={BookOpen} />;
}
