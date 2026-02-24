"use client";

import { useState, useEffect, useCallback } from "react";
import { Crown, CreditCard, ExternalLink, Check, Loader2, ArrowUpCircle } from "lucide-react";
import { HelpLink } from "@/components/ui/help-link"
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

interface Subscription {
  id: string;
  status: string;
  billing_interval: string;
  amount_cents: number;
  currency: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  stripe_receipt_url: string | null;
  created_at: string;
}

export function BillingClient({
  subscription: initialSubscription,
  transactions,
  isPremium,
}: {
  subscription: Subscription | null;
  transactions: Transaction[];
  isPremium: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);
  const [subscription, setSubscription] = useState(initialSubscription);
  const [verifying, setVerifying] = useState(false);
  const [authorSubs, setAuthorSubs] = useState<any[]>([]);

  const verifySession = useCallback(async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/stripe/verify-session", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
        // Reload to get fresh server data
        window.location.href = "/settings/billing";
      }
    } catch {
      // Webhook will handle it eventually
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isSuccess = params.get("success") === "true";
    const isCanceled = params.get("canceled") === "true";
    setShowSuccess(isSuccess);
    setShowCanceled(isCanceled);

    // If checkout succeeded but we don't have a subscription yet, verify it
    if (isSuccess && !initialSubscription) {
      verifySession();
    }

    // Fetch author subscriptions
    fetchAuthorSubscriptions();
  }, [initialSubscription, verifySession]);

  async function fetchAuthorSubscriptions() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: authorSubsData } = await supabase
      .from('author_subscriptions')
      .select(`
        id,
        tier_name,
        status,
        amount_cents,
        current_period_end,
        cancel_at_period_end,
        author_id,
        profiles!author_id(username, display_name)
      `)
      .eq('subscriber_id', user.id)
      .order('created_at', { ascending: false });

    if (authorSubsData) setAuthorSubs(authorSubsData);
  }

  const handleSubscribe = async (interval: "monthly" | "annual") => {
    setLoading(interval);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to start checkout" });
    } finally {
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: "error", text: data.error || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to open billing portal" });
    } finally {
      setLoading(null);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isMonthly = subscription?.billing_interval === "monthly";
  const isAnnual = subscription?.billing_interval === "annual";
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">Billing <HelpLink href="/guides/readers/premium" label="Premium guide" /></h2>
        <p className="text-sm text-muted-foreground">
          Manage your Reader Premium subscription
        </p>
      </div>

      {showSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-400">
              Welcome to Reader Premium! 🎉
            </p>
            <p className="text-xs text-green-400/70 mt-0.5">
              Your subscription is now active. Enjoy ad-free reading!
            </p>
          </div>
        </div>
      )}

      {verifying && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
          <p className="text-sm text-blue-400">
            Activating your premium subscription...
          </p>
        </div>
      )}

      {showCanceled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            Checkout was canceled. No charges were made.
          </p>
        </div>
      )}

      {message && (
        <div className={`rounded-lg p-4 text-sm ${
          message.type === "error" 
            ? "bg-red-500/10 border border-red-500/20 text-red-400" 
            : "bg-green-500/10 border border-green-500/20 text-green-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* Current Subscription */}
      {subscription && isActive ? (
        <div className="border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">Reader Premium</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 font-medium">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-muted-foreground">Current Plan</p>
              <p className="font-medium">
                {formatAmount(subscription.amount_cents, subscription.currency || "usd")}/{isAnnual ? "year" : "month"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {subscription.cancel_at_period_end ? "Expires" : "Renews"}
              </p>
              <p className="font-medium">
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>

          {subscription.cancel_at_period_end && (
            <p className="text-sm text-yellow-500 mb-4">
              Your subscription will end on {formatDate(subscription.current_period_end)}. 
              You can resubscribe at any time.
            </p>
          )}

          {/* Upgrade to Annual if on Monthly */}
          {isMonthly && !subscription.cancel_at_period_end && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Save with Annual</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Switch to annual billing and save $6/year ($2.50/mo instead of $3/mo)
              </p>
              <button
                onClick={handleManage}
                disabled={loading === "manage"}
                className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Switch to Annual — $30/year
              </button>
            </div>
          )}

          <button
            onClick={handleManage}
            disabled={loading === "manage"}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border hover:bg-accent transition-colors disabled:opacity-50"
          >
            {loading === "manage" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Manage Subscription
          </button>
        </div>
      ) : (
        /* Pricing Cards for non-subscribers */
        <div>
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold mb-1">Upgrade to Reader Premium</h3>
            <p className="text-sm text-muted-foreground">
              Support the platform and enjoy an enhanced reading experience.
              {" "}
              <Link href="/premium" className="text-primary hover:underline">
                See all benefits →
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-6 flex flex-col">
              <h3 className="font-semibold mb-1">Monthly</h3>
              <p className="text-3xl font-bold mb-1">
                $3<span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">Cancel anytime</p>
              <ul className="text-sm space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Premium badge on your profile
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Ad-free reading experience
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Support independent authors
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("monthly")}
                disabled={loading !== null}
                className="w-full py-2.5 px-4 rounded-md border-2 border-primary text-primary font-medium hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === "monthly" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Subscribe Monthly
              </button>
            </div>

            <div className="border-2 border-primary rounded-lg p-6 flex flex-col relative">
              <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">
                BEST VALUE
              </div>
              <h3 className="font-semibold mb-1">Annual</h3>
              <p className="text-3xl font-bold mb-1">
                $30<span className="text-base font-normal text-muted-foreground">/year</span>
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                $2.50/month — save $6/year
              </p>
              <ul className="text-sm space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Everything in Monthly
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Save $6 per year
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 shrink-0" /> Lower payment processing fees
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe("annual")}
                disabled={loading !== null}
                className="w-full py-2.5 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === "annual" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                Subscribe Annually
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Payment History</h3>
          <div className="border rounded-lg divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{tx.description || tx.type}</p>
                  <p className="text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${
                    tx.status === "succeeded" ? "text-green-500" : 
                    tx.status === "failed" ? "text-red-500" : "text-yellow-500"
                  }`}>
                    {formatAmount(tx.amount_cents, tx.currency)}
                  </span>
                  {tx.stripe_receipt_url && (
                    <a
                      href={tx.stripe_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Author Subscriptions */}
      {authorSubs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Author Subscriptions</h2>
          <div className="space-y-3">
            {authorSubs.map(sub => (
              <Card key={sub.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      <Link href={`/profile/${sub.profiles?.username}`} className="hover:text-primary transition-colors">
                        {sub.profiles?.display_name || sub.profiles?.username || 'Unknown Author'}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sub.tier_name.charAt(0).toUpperCase() + sub.tier_name.slice(1)} · ${(sub.amount_cents / 100).toFixed(2)}/mo
                    </p>
                    {sub.current_period_end && (
                      <p className="text-xs text-muted-foreground">
                        {sub.cancel_at_period_end ? 'Cancels' : 'Renews'} {new Date(sub.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                    {sub.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
