import { Building2, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Organization } from "@/types/database";

interface OrgStatsProps {
  organizations: Organization[];
}

export function OrgStats({ organizations }: OrgStatsProps) {
  const totalOrgs = organizations.length;
  const totalMembers = organizations.reduce((sum, org) => sum + (org.member_count ?? 0), 0);
  const avgMembers = totalOrgs > 0 ? (totalMembers / totalOrgs).toFixed(1) : "0";

  const stats = [
    { title: "Organizations", value: totalOrgs, icon: Building2, color: "text-blue-500 dark:text-blue-400" },
    { title: "Total Members", value: totalMembers, icon: Users, color: "text-green-500 dark:text-green-400" },
    { title: "Avg Members", value: avgMembers, icon: TrendingUp, color: "text-purple-500 dark:text-purple-400" },
  ];

  return (
    <div className="grid gap-3 grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="border">
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
