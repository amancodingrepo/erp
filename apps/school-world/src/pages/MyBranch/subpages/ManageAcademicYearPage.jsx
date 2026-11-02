import React from "react";
import { CalendarDays } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageAcademicYearPage(props) {
  return <MyBranchFeatureShell {...props} group="Academics" title="Manage Academic Year" description="Add or update academic years. Here we set current and next academic years." Icon={CalendarDays} />;
}
