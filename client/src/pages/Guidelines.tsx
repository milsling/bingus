import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";

export default function Guidelines() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 -ml-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight">
            Community Guidelines
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <div className="bg-card/50 border border-border rounded-lg p-6 space-y-4 text-foreground">
              <p className="text-lg leading-relaxed">
                Yo, listen up you punchline demons and freestyle goblins,
              </p>
              
              <p className="leading-relaxed">
                I don't give a flying fuck what kinda bars you drop here. Orphan those fire lines rotting in your rhyme book—double entendres, nasty wordplay, brutal disses, clever schemes, goofy shit, dark shit, whatever makes the breakdown slap. Post the sickest orphans you got, like 'em, tag 'em, argue about 'em in the comments. This spot's built to be raw, unfiltered, and chaotic. Let the bars battle it out.
              </p>
              
              <div className="border-l-4 border-destructive pl-4 py-2 my-6">
                <p className="font-bold text-destructive text-xl mb-2">
                  One rule. ONE. Don't test me.
                </p>
                <p className="text-destructive/90 font-semibold">
                  No pedo shit. No CP. No creepy underage bars or vibes. Ever.
                </p>
              </div>
              
              <p className="leading-relaxed">
                Touch that and you're gone—account nuked, bars deleted, no warning, no comeback. I'll erase you faster than a wack punchline.
              </p>
              
              <p className="leading-relaxed">
                Don't make me slap on some weak-ass content filter or start babysitting this place. I want it filthy and free, not locked down like a prison cypher. Keep your bars adult, keep 'em savage, keep 'em far from that single dead zone.
              </p>
              
              <p className="text-lg leading-relaxed mt-6">
                Now quit stalling and orphan some heat, cuh. Make me proud. 😏💦
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
