import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { BookText, LayoutGrid, NotebookPen } from "lucide-react";
import { motion } from "framer-motion";
import { useBars } from "@/context/BarContext";

const apps = [
  {
    id: "orphanstudio",
    title: "OrphanStudio",
    description: "Lyric workspace with built-in rhyme suggestions and local autosave",
    icon: NotebookPen,
    path: "/orphanstudio",
    color: "from-fuchsia-500 to-violet-600",
    requiresAuth: false,
  },
  {
    id: "rhyme",
    title: "Rhyme Dictionary",
    description: "Find perfect rhymes, near rhymes, and related words",
    icon: BookText,
    path: "/apps/rhyme",
    color: "from-purple-500 to-purple-600",
    requiresAuth: false,
  },
];

export default function Apps() {
  const [, navigate] = useLocation();
  const { currentUser: user } = useBars();

  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      <div className="container max-w-4xl mx-auto p-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <LayoutGrid className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-logo)' }}>Apps</h1>
            <p className="text-sm text-muted-foreground">Tools for lyricists</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apps.map((app, index) => {
            const Icon = app.icon;
            const isDisabled = app.requiresAuth && !user;
            
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isDisabled && navigate(app.path)}
                  data-testid={`card-app-${app.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${app.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{app.title}</CardTitle>
                        <CardDescription>{app.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {isDisabled && (
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">Login required</p>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
