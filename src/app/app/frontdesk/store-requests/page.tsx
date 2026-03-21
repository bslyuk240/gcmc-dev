import { DeptStoreRequests } from "@/components/store/dept-store-requests";

const SUGGESTED = [
  "Patient Wristbands", "Print Paper A4", "Printer Ink Cartridges",
  "Ballpoint Pens", "Staples", "Stapler", "Paper Clips",
  "Patient Registration Forms", "OPD Cards", "Appointment Slips",
  "Referral Forms", "Receipt Books", "Folders / Binders",
  "Hand Sanitiser (500ml)", "Tissue Boxes", "Disposable Cups",
  "Correction Fluid", "Rubber Bands", "Adhesive Labels",
];

export default function FrontdeskStoreRequestsPage() {
  return (
    <DeptStoreRequests
      dept="Front Desk"
      deptLabel="Front Desk"
      suggestedItems={SUGGESTED}
      requestedBy="Front Desk Staff"
    />
  );
}
