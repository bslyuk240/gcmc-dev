import { DeptStoreRequests } from "@/components/store/dept-store-requests";

const SUGGESTED = [
  "N95 Respirators", "Surgical Gloves (Medium)", "Surgical Gloves (Large)",
  "Disposable Syringes 5ml", "IV Cannula 18G", "IV Cannula 20G",
  "Gauze Bandages 10cm", "Alcohol Swabs", "Oxygen Masks (Adult)",
  "Oxygen Masks (Paediatric)", "Urine Bags", "Catheter 14FR",
  "Specimen Collection Cups", "Medical Tape", "Cotton Wool Rolls",
  "Patient Wristbands", "Disposable Aprons", "Glove-free Lancets",
];

export default function NursesStoreRequestsPage() {
  return (
    <DeptStoreRequests
      dept="Nurses"
      deptLabel="Nursing"
      suggestedItems={SUGGESTED}
      requestedBy="Nurse"
    />
  );
}
