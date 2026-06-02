import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useMembers } from "@/hooks/useMembers";
import { useDeleteOrganization } from "@/hooks/useDeleteOrganization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberList } from "@/components/members/MemberList";
import { InviteMemberForm } from "@/components/members/InviteMemberForm";
import { OrganizationType } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface OrganizationDetailProps {
  orgId: string;
}

const typeBadgeVariant: Record<
  OrganizationType,
  "info" | "success" | "purple"
> = {
  [OrganizationType.School]: "info",
  [OrganizationType.Nonprofit]: "success",
  [OrganizationType.Business]: "purple",
};

export function OrganizationDetail({ orgId }: OrganizationDetailProps) {
  const navigate = useNavigate();
  const { data: org, isLoading: orgLoading, error: orgError } = useOrganization(orgId);
  const { data: members = [], isLoading: membersLoading } = useMembers(orgId);
  const deleteOrg = useDeleteOrganization();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteOrg.mutateAsync(orgId);
      toast({
        title: "Organization deleted",
        description: `"${org?.name}" has been deleted.`,
      });
      navigate("/dashboard/organizations");
    } catch {
      toast({
        title: "Delete failed",
        description: "Could not delete the organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmOpen(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded-lg border bg-muted" />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-lg font-semibold">Organization not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This organization doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link
          to="/dashboard/organizations"
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Back to Organizations
        </Link>
      </div>
    );
  }

  const badgeVariant = typeBadgeVariant[org.type] ?? "secondary";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/dashboard/organizations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All Organizations
      </Link>

      {/* Org header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={badgeVariant}>{org.type}</Badge>
            {org.school_district && (
              <span className="text-sm text-muted-foreground">
                {org.school_district}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              Created {formatDate(org.created_at)}
            </span>
          </div>
        </div>

        {/* Delete button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete organization?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">"{org.name}"</span>{" "}
              and all its members. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleteOrg.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteOrg.isPending}
              className="flex items-center gap-2"
            >
              {deleteOrg.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete organization
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members + Invite — 2-col on desktop */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Members section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MemberList members={members} isLoading={membersLoading} />
          </CardContent>
        </Card>

        {/* Invite form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a Member</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteMemberForm organizationId={orgId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
