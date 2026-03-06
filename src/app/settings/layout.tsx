import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { User, Circle, Bell, Trash2, CreditCard, BookOpen } from "lucide-react";
import { PremiumUpsellCompact } from "@/components/premium-upsell";

export const dynamic = "force-dynamic";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check premium status for upsell
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  const isPremium = profile?.is_premium || false;

  const navItems = [
    { href: "/settings/profile", label: "Profile", icon: User },
    { href: "/settings/reading", label: "Reading", icon: BookOpen },
    { href: "/settings/borders", label: "Borders", icon: Circle },
    { href: "/settings/billing", label: "Billing", icon: CreditCard },
    { href: "/settings/notifications", label: "Notifications", icon: Bell },
    { href: "/settings/account", label: "Account", icon: Trash2 },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <nav className="md:w-48 shrink-0 space-y-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Premium upsell for non-premium users */}
          {!isPremium && (
            <div className="pt-2 border-t">
              <PremiumUpsellCompact />
            </div>
          )}
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
