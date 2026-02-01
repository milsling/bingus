import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, Mic2, Heart, Bookmark, Users, Trophy, MessageCircle, Home, User, Lightbulb, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  action?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Orphan Bars!",
    description: "This is your home for sharing rap bars, punchlines, and wordplay. Let's take a quick tour of the platform.",
    icon: Sparkles,
    position: "center",
  },
  {
    id: "feed",
    title: "Your Feed",
    description: "This is where you'll see bars from people you follow and trending content. Scroll through to discover fire lyrics.",
    icon: Home,
    position: "center",
  },
  {
    id: "drop_bar",
    title: "Drop Your Bars",
    description: "Ready to share your lyrics? Tap the 'Drop Bar' button to post your punchlines, snippets, or half verses.",
    icon: Mic2,
    position: "top",
    action: "Look for the purple 'Drop Bar' button in the navigation",
  },
  {
    id: "interact",
    title: "Show Love",
    description: "Like bars that hit hard, bookmark your favorites, and leave comments to connect with other lyricists.",
    icon: Heart,
    position: "center",
  },
  {
    id: "save",
    title: "Build Your Collection",
    description: "Bookmark bars you love to save them for later. Access your saved bars anytime from the Saved page.",
    icon: Bookmark,
    position: "center",
  },
  {
    id: "friends",
    title: "Connect with Lyricists",
    description: "Follow other artists, send friend requests, and build your network of fellow wordsmiths.",
    icon: Users,
    position: "center",
  },
  {
    id: "messages",
    title: "Direct Messages",
    description: "Chat privately with friends, collaborate on bars, or just chop it up with the community.",
    icon: MessageCircle,
    position: "center",
  },
  {
    id: "xp",
    title: "Level Up!",
    description: "Earn XP by posting bars, getting likes, and engaging with the community. Higher levels unlock special perks and badges.",
    icon: Trophy,
    position: "center",
  },
  {
    id: "profile",
    title: "Your Profile",
    description: "Customize your profile, showcase your best badges, and build your catalog of bars.",
    icon: User,
    position: "center",
  },
  {
    id: "ai_tools",
    title: "AI Writing Assistant",
    description: "Stuck on a bar? Use Orphie, our AI assistant, to help brainstorm rhymes, find synonyms, or polish your wordplay.",
    icon: Lightbulb,
    position: "center",
  },
  {
    id: "complete",
    title: "You're Ready!",
    description: "That's the basics! Now go drop some fire bars and make your mark on the platform.",
    icon: CheckCircle,
    position: "center",
  },
];

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTutorial({ onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(() => {
    if (isLastStep) {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    setTimeout(onSkip, 300);
  }, [onSkip]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleSkip]);

  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleSkip} />
          
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
                data-testid="tutorial-skip-btn"
              >
                <X className="h-5 w-5 text-white/50" />
              </button>

              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 flex items-center justify-center mb-4"
                >
                  <Icon className="h-8 w-8 text-primary" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-white mb-2"
                >
                  {step.title}
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/60 text-sm leading-relaxed mb-2"
                >
                  {step.description}
                </motion.p>

                {step.action && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-primary/80 text-xs font-medium bg-primary/10 px-3 py-1.5 rounded-full mb-4"
                  >
                    {step.action}
                  </motion.p>
                )}

                <div className="flex items-center gap-1.5 my-4">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === currentStep
                          ? "w-6 bg-primary"
                          : index < currentStep
                          ? "w-1.5 bg-primary/50"
                          : "w-1.5 bg-white/20"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full mt-2">
                  {!isFirstStep && (
                    <Button
                      variant="ghost"
                      onClick={handlePrev}
                      className="flex-1 text-white/60 hover:text-white hover:bg-white/10"
                      data-testid="tutorial-prev-btn"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNext}
                    className={cn(
                      "flex-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white font-semibold",
                      isFirstStep && "flex-none px-8"
                    )}
                    data-testid="tutorial-next-btn"
                  >
                    {isLastStep ? "Get Started" : "Next"}
                    {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </div>

                <button
                  onClick={handleSkip}
                  className="mt-4 text-xs text-white/40 hover:text-white/60 transition-colors"
                  data-testid="tutorial-skip-text"
                >
                  Skip tutorial
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(() => {
    return localStorage.getItem("orphan_bars_tutorial_completed") === "true";
  });

  const startTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem("orphan_bars_tutorial_completed", "true");
    setHasCompletedTutorial(true);
    setShowTutorial(false);
  }, []);

  const skipTutorial = useCallback(() => {
    localStorage.setItem("orphan_bars_tutorial_completed", "true");
    setHasCompletedTutorial(true);
    setShowTutorial(false);
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem("orphan_bars_tutorial_completed");
    setHasCompletedTutorial(false);
  }, []);

  return {
    showTutorial,
    hasCompletedTutorial,
    startTutorial,
    completeTutorial,
    skipTutorial,
    resetTutorial,
  };
}
