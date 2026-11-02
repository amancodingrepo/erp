import React from "react";
import { Camera } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function BulkStudentParentPhotosPage(props) {
  return <MyBranchFeatureShell {...props} group="Administrative" title="Upload student and parent photos in bulk" description="Bulk Student Data Update through import export." Icon={Camera} />;
}
