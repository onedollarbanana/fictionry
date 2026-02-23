"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoryUrl, getChapterUrl } from "@/lib/url-utils";
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
import { Eye, EyeOff, Check, X, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
  reporter: { id: string; username: string; avatar_url: string | null } | null;
  resolver: { username: string } | null;
}

interface ReportsClientProps {
  storySlugMap: Record<string, { slug: string; short_id: string }>;
  reports: Report[];
}

type FilterStatus = "all" | "pending" | "resolved" | "dismissed";
type FilterReason = "all" | "spam" | "harassment" | "inappropriate" | "hate_speech" | "copyright" | "misinformation" | "other";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate: "Inappropriate",
  hate_speech: "Hate Speech",
  copyright: "Copyright",
  misinformation: "Misinformation",
  other: "Other",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  story: "Story",
  chapter: "Chapter",
  comment: "Comment",
  rating: "Review",
  user: "User",
};

export function ReportsClient({ reports, storySlugMap }: ReportsClientProps) {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending");
  const [reasonFilter, setReasonFilter] = useState<FilterReason>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"resolve" | "dismiss" | "hide" | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [hideReason, setHideReason] = useState("");
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  const filteredReports = reports.filter((report) => {
    if (statusFilter !== "all" && report.status !== statusFilter) return false;
    if (reasonFilter !== "all" && report.reason !== reasonFilter) return false;
    return true;
  });

  const toggleExpanded = (reportId: string) => {
    setExpandedReports((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const openActionDialog = (report: Report, action: "resolve" | "dismiss" | "hide") => {
    setSelectedReport(report);
    setActionType(action);
    setResolutionNotes("");
    setHideReason("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedReport || !actionType) return;

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (actionType === "hide") {
        const tableName = selectedReport.content_type === "rating" ? "story_ratings" : `${selectedReport.content_type}s`;
        
        await supabase
          .from(tableName)
          .update({
            is_hidden: true,
            hidden_reason: hideReason || "Removed by moderator",
            hidden_at: new Date().toISOString(),
            hidden_by: user.id,
          })
          .eq("id", selectedReport.content_id);

        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            resolution_notes: `Content hidden. ${resolutionNotes}`.trim(),
          })
          .eq("id", selectedReport.id);
      } else {
        await supabase
          .from("reports")
          .update({
            status: actionType === "resolve" ? "resolved" : "dismissed",
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            resolution_notes: resolutionNotes || null,
          })
          .eq("id", selectedReport.id);
      }

      setActionDialogOpen(false);
      setSelectedReport(null);
      setActionType(null);
      router.refresh();
    });
  };

  const getContentLink = (report: Report): string => {
    switch (report.content_type) {
      case "story": {
        const s = storySlugMap[report.content_id];
        return s ? getStoryUrl({ id: report.content_id, slug: s.slug, short_id: s.short_id }) : `/story/${report.content_id}`;
      }
      case "chapter": {
        const story = storySlugMap[`chapter:${report.content_id}`];
        const ch = storySlugMap[`chapterSelf:${report.content_id}`];
        return story && ch
          ? getChapterUrl({ id: "", slug: story.slug, short_id: story.short_id }, { short_id: ch.short_id, slug: ch.slug })
          : `/story/chapter/${report.content_id}`;
      }
      case "comment":
        return `#comment-${report.content_id}`;
      case "rating":
        return `#rating-${report.content_id}`;
      case "user":
        return `/profile/${report.content_id}`;
      default:
        return "#";
    }
  };

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter" className="text-sm">Status:</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <SelectTrigger id="status-filter" className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="reason-filter" className="text-sm">Reason:</Label>
          <Select value={reasonFilter} onValueChange={(v) => setReasonFilter(v as FilterReason)}>
            <SelectTrigger id="reason-filter" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No reports match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const isExpanded = expandedReports.has(report.id);
            return (
              <Card key={report.id} className={cn(report.status === "pending" && "border-yellow-500/50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          report.status === "pending"
                            ? "default"
                            : report.status === "resolved"
                            ? "secondary"
                            : "outline"
                        }
                        className={cn(
                          report.status === "pending" && "bg-yellow-500 text-yellow-950"
                        )}
                      >
                        {report.status}
                      </Badge>
                      <CardTitle className="text-base">
                        {CONTENT_TYPE_LABELS[report.content_type] || report.content_type}:{" "}
                        <span className="text-primary">{REASON_LABELS[report.reason] || report.reason}</span>
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={getContentLink(report)} target="_blank">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(report.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Reported by @{report.reporter?.username || "unknown"} •{" "}
                    {new Date(report.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-2 space-y-4">
                    {report.details && (
                      <div>
                        <p className="text-sm font-medium mb-1">Additional Details:</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {report.details}
                        </p>
                      </div>
                    )}

                    {report.resolution_notes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Resolution Notes:</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          {report.resolution_notes}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Resolved by @{report.resolver?.username} on{" "}
                          {report.resolved_at && new Date(report.resolved_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {report.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openActionDialog(report, "hide")}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Hide Content
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openActionDialog(report, "resolve")}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openActionDialog(report, "dismiss")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Dismiss
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
              {actionType === "hide" && "Hide Content"}
              {actionType === "resolve" && "Resolve Report"}
              {actionType === "dismiss" && "Dismiss Report"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "hide" &&
                "This will hide the content from public view. The author can still see it."}
              {actionType === "resolve" &&
                "Mark this report as resolved. Use this when you've taken action."}
              {actionType === "dismiss" &&
                "Dismiss this report as invalid or not actionable."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === "hide" && (
              <div className="space-y-2">
                <Label htmlFor="hide-reason">Reason for hiding</Label>
                <Textarea
                  id="hide-reason"
                  placeholder="e.g., Violates community guidelines..."
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Notes (optional)</Label>
              <Textarea
                id="resolution-notes"
                placeholder="Add any notes about this resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isPending}
              variant={actionType === "hide" ? "destructive" : "default"}
            >
              {isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
