import { DeptStoreRequests } from "@/components/store/dept-store-requests";

const SUGGESTED = [
  "Blood Collection Tubes (EDTA)", "Blood Collection Tubes (Plain)",
  "Blood Collection Tubes (Citrate)", "Microscope Slides",
  "Cover Slips", "Specimen Containers", "Urine Containers",
  "Stool Containers", "Lab Reagents (General)", "Gram Stain Kit",
  "Giemsa Stain", "Disposable Gloves (Nitrile)", "Lab Coats",
  "Safety Goggles", "Biohazard Bags", "Centrifuge Tubes",
  "Pipette Tips", "Swab Sticks", "Print Paper A4", "Thermal Printer Paper",
];

export default function LabStoreRequestsPage() {
  return (
    <DeptStoreRequests
      dept="Lab"
      deptLabel="Laboratory"
      suggestedItems={SUGGESTED}
      requestedBy="Lab Staff"
    />
  );
}
