import { DeptStoreRequests } from "@/components/store/dept-store-requests";

const SUGGESTED = [
  "Surgical Gloves (Medium)", "Surgical Gloves (Large)", "N95 Respirators",
  "Disposable Gowns", "Alcohol Swabs", "Gauze Bandages 10cm",
  "Oxygen Masks (Adult)", "Stethoscope Covers", "Examination Gloves",
  "Tongue Depressors", "Medical Tape", "Cotton Wool Rolls",
  "Specimen Containers", "Blood Glucose Test Strips", "Lancets",
  "Prescription Pads", "Patient Record Forms", "Referral Forms",
];

export default function DoctorsStoreRequestsPage() {
  return (
    <DeptStoreRequests
      dept="Doctors"
      deptLabel="Doctors"
      suggestedItems={SUGGESTED}
      requestedBy="Doctor"
    />
  );
}
