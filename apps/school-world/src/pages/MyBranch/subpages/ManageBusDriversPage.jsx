import React from "react";
import { Truck } from "lucide-react";
import MyBranchFeatureShell from "../MyBranchFeatureShell.jsx";

export default function ManageBusDriversPage(props) {
  return <MyBranchFeatureShell {...props} group="Users" title="Manage Bus Drivers" description="Add or update driver details." Icon={Truck} />;
}
