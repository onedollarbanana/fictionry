"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoryUrl } from "@/lib/url-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileX,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DmcaClaim {
  id: string;
  story_id: string;
  claimant_name: string;
  claimant_email: string;
  claimant_address: string | null;
  original_work_url: string | null;
  description: string;
  status: string;
  created_at: string;
  handled_at: string | null;
  handler_notes: string | null;
  story: { id: string; title: string; author_id: string } | null;
  handler: { username: string } | null;
}

interface DmcaClientProps {
  claims: DmcaClaim[];
}

type FilterStatus = "all" | "pending" | "valid" | "rejected" | "counter_filed";

export function DmcaClient({ claims }: DmcaClientProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending");
  const [expandedClaims, setExpandedClaims] = useState<Set<string>>(new Set());
  const [selectedClaim, setSelectedClaim] = useState<DmcaClaim | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"valid" | "rejected" | null>(null);
  const [handlerNotes, setHandlerNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  const filteredClaims = claims.filter((claim) => {
    if (statusFilter !== "all" && claim.status !== statusFilter) return false;
    return true;
  });

  const toggleExpanded = (claimId: string) => {
    setExpandedClaims((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(claimId)) {
        newSet.delete(claimId);
      } else {
        newSet.add(claimId);
      }
      return newSet;
    });
  };

  const openActionDialog = (claim: DmcaClaim, action: "valid" | "rejected") => {
    setSelectedClaim(claim);
    setActionType(action);
    setHandlerNotes("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedClaim || !actionType) return;

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("dmca_claims")
        .update({
          status: actionType,
          handled_by: user.id,
          handled_at: new Date().toISOString(),
          handler_notes: handlerNotes || null,
        })
        .eq("id", selectedClaim.id);

      if (actionType === "valid" && selectedClaim.story_id) {
        await supabase
          .from("stories")
          .update({
            is_hidden: true,
            hidden_reason: "DMCA takedown",
            hidden_at: new Date().toISOString(),
            hidden_by: user.id,
          })
          .eq("id", selectedClaim.story_id);
      }

      setActionDialogOpen(false);
      setSelectedClaim(null);
      setActionType(null);
      router.refresh();
    });
  };

  const pendingCount = claims.filter((c) => c.status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="default" className="bg-yellow-500 text-yellow-950">Pending</Badge>;
      case "valid":
        return <Badge variant="destructive">Valid - Taken Down</Badge>;
      case "rejected":
        return <Badge variant="secondary">Rejected</Badge>;
      case "counter_filed":
        return <Badge variant="outline">Counter-Filed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Scale className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-300">DMCA Process</p>
              <p className="text-blue-600 dark:text-blue-400">
                Review each claim carefully. Valid claims require immediate takedown.
                Rejected claims should include documentation of why the claim is invalid.
                Authors can file counter-notices within 14 days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-sm">Status:</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Claims</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="valid">Valid (Taken Down)</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="counter_filed">Counter-Filed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No DMCA claims match your filters</p>
            {statusFilter === "pending" && (
              <p className="text-sm text-muted-foreground mt-1">That&apos;s good news!</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => {
            const isExpanded = expandedClaims.has(claim.id);
            return (
              <Card key={claim.id} className={cn(claim.status === "pending" && "border-yellow-500/50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(claim.status)}
                        <CardTitle className="text-base">
                          Claim against: {claim.story?.title || "Unknown Story"}
                        </CardTitle>
                      </div>
                      <CardDescription>
                        Filed by {claim.claimant_name} ({claim.claimant_email}) •{" "}
                        {new Date(claim.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {claim.story && (
                        <Link href={getStoryUrl(claim.story)} target="_blank">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Story
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(claim.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-2 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium mb-1">Claimant Details</p>
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                          <p><strong>Name:</strong> {claim.claimant_name}</p>
                          <p><strong>Email:</strong> {claim.claimant_email}</p>
                          {claim.claimant_address && (
                            <p><strong>Address:</strong> {claim.claimant_address}</p>
                          )}
                        </div>
                      </div>
                      {claim.original_work_url && (
                        <div>
                          <p className="text-sm font-medium mb-1">Original Work</p>
                          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                            <a
                              href={claim.original_work_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline break-all"
                            >
                              {claim.original_work_url}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Description of Infringement</p>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap">
                        {claim.description}
                      </p>
                    </div>

                    {claim.handler_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Handler Notes</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {claim.handler_notes}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Handled by @{claim.handler?.username} on{" "}
                          {claim.handled_at && new Date(claim.handled_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {claim.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openActionDialog(claim, "valid")}
                        >
                          <FileCheck className="h-4 w-4 mr-1" />
                          Valid - Take Down
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(claim, "rejected")}
                        >
                          <FileX className="h-4 w-4 mr-1" />
                          Reject Claim
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "valid" ? "Confirm Valid DMCA Claim" : "Reject DMCA Claim"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "valid"
                ? "This will immediately hide the story from public view. The author will be notified and can file a counter-notice."
                : "Document why this claim is being rejected. The claimant will be notified."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="handler-notes">
                {actionType === "valid" ? "Notes (optional)" : "Rejection reason *"}
              </Label>
              <Textarea
                id="handler-notes"
                placeholder={
                  actionType === "valid"
                    ? "Any additional notes about this takedown..."
                    : "Explain why this claim is invalid..."
                }
                value={handlerNotes}
                onChange={(e) => setHandlerNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isPending || (actionType === "rejected" && !handlerNotes.trim())}
              variant={actionType === "valid" ? "destructive" : "default"}
            >
              {isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
