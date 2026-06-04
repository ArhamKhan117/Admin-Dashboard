import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Organization } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface ExportButtonProps {
  organizations: Organization[];
}

export function ExportButton({ organizations }: ExportButtonProps) {
  const handleExport = () => {
    const headers = ["Name", "Type", "School District", "Member Count", "Created At"];
    const rows = organizations.map((org) => [
      org.name,
      org.type,
      org.school_district ?? "N/A",
      String(org.member_count ?? 0),
      formatDate(org.created_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `organizations-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={organizations.length === 0}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}
