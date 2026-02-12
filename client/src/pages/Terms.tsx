import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pt-14 pb-20 md:pb-4 md:pt-24">
      
      <main className="w-full max-w-3xl lg:max-w-4xl xl:max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2 -ml-2" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-black uppercase tracking-tight">
              Terms of Service
            </h1>
          </div>
          
          <p className="text-sm text-muted-foreground">Last updated: January 4, 2026</p>
          
          <div className="prose prose-invert max-w-none">
            <div className="bg-card/50 border border-border rounded-lg p-6 space-y-6 text-foreground">
              
              <section>
                <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
                <p className="leading-relaxed text-muted-foreground">
                  By accessing or using OrphanBars.com (the "Site"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Site.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">2. Description of Service</h2>
                <p className="leading-relaxed text-muted-foreground">
                  OrphanBars is a platform where users can post, share, like, comment on, and follow original rap bars and lyrics. The Site provides a unique proof-of-origin feature that generates immutable certificates for posted content to verify authorship at the time of posting.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">3. User Accounts</h2>
                <p className="leading-relaxed text-muted-foreground">
                  You must create an account to post content or use certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">4. Content Ownership and Licensing</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>You retain full ownership of any original content ("Bars") you post.</li>
                  <li>By posting a Bar, you grant OrphanBars a worldwide, non-exclusive, royalty-free license to display, distribute, and promote the Bar on the Site and associated services.</li>
                  <li>You represent and warrant that your posted content does not infringe any third-party rights, including copyrights, trademarks, or privacy rights.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">5. Proof of Origin</h2>
                <p className="leading-relaxed text-muted-foreground">
                  The Site's proof-of-origin feature generates a timestamped, hashed certificate for each posted Bar. This certificate serves as evidence of authorship at the time of posting but is not a legal guarantee of originality or non-infringement. OrphanBars makes no warranty regarding the ultimate validity of any claim of authorship.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">6. Prohibited Conduct</h2>
                <p className="leading-relaxed text-muted-foreground mb-2">You agree not to:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Post content that is unlawful, harassing, defamatory, abusive, or obscene.</li>
                  <li>Impersonate any person or entity.</li>
                  <li>Attempt to reverse-engineer, scrape, or interfere with the Site's functionality.</li>
                  <li>Post content you do not have the right to post.</li>
                  <li>Use the Site for commercial purposes without prior written consent.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">7. Termination</h2>
                <p className="leading-relaxed text-muted-foreground">
                  We reserve the right to suspend or terminate your account and access to the Site at our sole discretion, without notice, for any violation of these Terms or for any other reason.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">8. Disclaimer of Warranties</h2>
                <p className="leading-relaxed text-muted-foreground">
                  The Site is provided "as is" without warranties of any kind, express or implied. We do not guarantee that the Site will be uninterrupted, secure, or error-free.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">9. Limitation of Liability</h2>
                <p className="leading-relaxed text-muted-foreground">
                  To the fullest extent permitted by law, OrphanBars and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Site.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">10. Changes to Terms</h2>
                <p className="leading-relaxed text-muted-foreground">
                  We may update these Terms at any time. Continued use of the Site after changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">11. Governing Law</h2>
                <p className="leading-relaxed text-muted-foreground">
                  These Terms shall be governed by the laws of the United States, without regard to conflict of law principles.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">12. Contact</h2>
                <p className="leading-relaxed text-muted-foreground">
                  For questions about these Terms, contact us at support@orphanbars.space.
                </p>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
