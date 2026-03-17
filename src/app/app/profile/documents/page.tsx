import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ProfileDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Your uploaded documents and HR files."
      />
      <Card>
        <p className="text-sm text-slate-600">No documents uploaded yet.</p>
        <Button className="mt-4" variant="outline">Upload document</Button>
      </Card>
    </div>
  );
}
