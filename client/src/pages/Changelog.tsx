import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Calendar, Star, Zap, Shield, Palette, Bug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
  icon: React.ComponentType<any>;
  changes: string[];
  highlighted?: boolean;
}

const changelogEntries: ChangelogEntry[] = [
  {
    version: "2.4.0",
    date: "2025-02-24",
    title: "Mobile Navigation Redesign",
    description: "Complete overhaul of the mobile navigation experience with modern glass morphism styling",
    type: "feature",
    icon: Zap,
    highlighted: true,
    changes: [
      "Redesigned mobile nav with spring animations and staggered reveals",
      "Glass morphism styling with 40px blur and gradient accents",
      "Enhanced user profile card with online status and role badges",
      "Improved touch targets and mobile-first interactions",
      "Fixed mobile tab selector layout issues in Settings"
    ]
  },
  {
    version: "2.3.5",
    date: "2025-02-24",
    title: "Appearance Settings Overhaul",
    description: "Better organization of appearance settings with owner-only controls",
    type: "improvement",
    icon: Palette,
    changes: [
      "Separated user background selection from owner-only uploads",
      "Added custom background upload functionality (owner only)",
      "Site-wide default background settings",
      "Fixed mobile tab spacing and text overlay issues",
      "Added save confirmation with site-wide application"
    ]
  },
  {
    version: "2.3.0",
    date: "2025-02-20",
    title: "Enhanced Security & Performance",
    description: "Critical security updates and performance improvements",
    type: "improvement",
    icon: Shield,
    changes: [
      "Upgraded Node.js version compatibility for production",
      "Fixed session table creation for production deployments",
      "Increased memory limits for large build processes",
      "Resolved database schema migration issues"
    ]
  },
  {
    version: "2.2.1",
    date: "2025-02-15",
    title: "Bug Fixes & Stability",
    description: "Fixed critical bugs affecting user experience",
    type: "fix",
    icon: Bug,
    changes: [
      "Fixed notification sound playback on mobile devices",
      "Resolved infinite scroll issues in feed",
      "Fixed profile image upload failures",
      "Corrected timezone handling in timestamps"
    ]
  },
  {
    version: "2.2.0",
    date: "2025-02-10",
    title: "Custom Backgrounds",
    description: "Personalize your experience with custom backgrounds",
    type: "feature",
    icon: Palette,
    changes: [
      "Added 12+ built-in background themes",
      "Background selection saves to user preferences",
      "Optimized background loading and caching",
      "Responsive background scaling for all devices"
    ]
  },
  {
    version: "2.1.0",
    date: "2025-02-05",
    title: "Enhanced Notifications",
    description: "Better notification system with customizable sounds",
    type: "feature",
    icon: Plus,
    changes: [
      "Added notification sound customization",
      "Message sound preferences",
      "Improved notification delivery reliability",
      "Notification history and management"
    ]
  },
  {
    version: "2.0.0",
    date: "2025-01-30",
    title: "Glass Morphism UI",
    description: "Complete UI redesign with modern glass morphism effects",
    type: "feature",
    icon: Star,
    highlighted: true,
    changes: [
      "Full glass morphism design system implementation",
      "Enhanced visual depth with blur effects",
      "Improved contrast and readability",
      "Consistent design language across all components"
    ]
  }
];

const typeConfig = {
  feature: {
    bgColor: "bg-green-500/10",
    textColor: "text-green-400",
    borderColor: "border-green-500/20",
    icon: Star
  },
  improvement: {
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/20",
    icon: Zap
  },
  fix: {
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/20",
    icon: Bug
  }
};

export default function Changelog() {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  return (
    <div className="min-h-screen pt-14 pb-20 md:pt-24 md:pb-6 bg-background">
      <main className="mx-auto w-full max-w-4xl px-4 md:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold">What's New</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Stay updated with the latest features and improvements
            </p>
          </div>
        </div>

        {/* Featured Update */}
        {changelogEntries.filter(entry => entry.highlighted).map((entry) => (
          <Card key={entry.version} className="mb-6 glass-surface-strong border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <entry.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                      LATEST
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <CardTitle className="text-lg text-foreground">{entry.title}</CardTitle>
                  <CardDescription className="text-sm mt-1">{entry.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {entry.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        {/* Version History */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Version History</h2>
          {changelogEntries
            .filter(entry => !entry.highlighted)
            .map((entry) => {
              const config = typeConfig[entry.type];
              const IconComponent = entry.icon;
              
              return (
                <Card 
                  key={entry.version} 
                  className={cn(
                    "glass-surface border-border/70 transition-all duration-200 hover:border-border/50",
                    selectedVersion === entry.version && "ring-2 ring-primary/20"
                  )}
                  onClick={() => setSelectedVersion(selectedVersion === entry.version ? null : entry.version)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "p-1.5 rounded-lg flex-shrink-0",
                          config.bgColor
                        )}>
                          <IconComponent className={cn("h-4 w-4", config.textColor)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground">{entry.version}</span>
                            <span className="text-xs text-muted-foreground">{entry.date}</span>
                          </div>
                          <CardTitle className="text-base text-foreground">{entry.title}</CardTitle>
                          <CardDescription className="text-sm mt-1">{entry.description}</CardDescription>
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-full border font-medium",
                        config.bgColor,
                        config.textColor,
                        config.borderColor
                      )}>
                        {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {selectedVersion === entry.version && (
                    <CardContent className="pt-0 border-t border-border/30">
                      <ul className="space-y-2 mt-4">
                        {entry.changes.map((change, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0",
                              config.textColor.replace("text", "bg")
                            )} />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                </Card>
              );
            })}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center py-8 border-t border-border/30">
          <p className="text-sm text-muted-foreground mb-2">
            Want to suggest a feature or report an issue?
          </p>
          <Link href="/feedback">
            <Button variant="outline" size="sm">
              Send Feedback
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
