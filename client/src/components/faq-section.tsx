import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, Shield, File, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Which platforms are supported?",
    answer: "We support YouTube, TikTok, Instagram, Facebook, Twitter/X, Vimeo, Dailymotion, Reddit, Pinterest, and LinkedIn videos."
  },
  {
    question: "Is it free to use?",
    answer: "Yes, our video downloader is completely free to use with no hidden charges or subscriptions required."
  },
  {
    question: "What video qualities are available?",
    answer: "We offer multiple quality options from 240p to 4K (when available), plus audio-only downloads in MP3 format."
  },
  {
    question: "Do you store downloaded videos?",
    answer: "No, we do not store any downloaded content on our servers. Downloads are processed client-side for your privacy."
  },
  {
    question: "Are there any download limits?",
    answer: "We have reasonable rate limits to prevent abuse: 50 requests per 15 minutes and 10 downloads per minute."
  },
  {
    question: "Can I download private videos?",
    answer: "No, our service only works with publicly available videos. Private or restricted content cannot be downloaded."
  }
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <>
      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto mb-12">
        <Card className={cn(
          "glass-card rounded-3xl p-8",
          "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
          "border border-white/20 dark:border-white/10"
        )}>
          <CardContent className="p-0">
            <h3 className="text-white dark:text-white text-2xl font-semibold mb-8 text-center">
              Frequently Asked Questions
            </h3>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <Collapsible
                  key={index}
                  open={openItems.includes(index)}
                  onOpenChange={() => toggleItem(index)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-left flex justify-between items-center",
                        "text-white dark:text-white font-medium py-3 px-0",
                        "hover:text-primary-300 dark:hover:text-primary-300 transition-colors",
                        "border-b border-white/10 dark:border-white/10"
                      )}
                      data-testid={`faq-question-${index}`}
                    >
                      <span>{item.question}</span>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 transform transition-transform",
                          openItems.includes(index) ? "rotate-180" : ""
                        )} 
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="text-white/70 dark:text-white/70 text-sm mt-2 pb-4">
                    {item.answer}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Legal Disclaimer */}
      <section className="max-w-4xl mx-auto mb-12">
        <Card className={cn(
          "glass-card rounded-3xl p-8",
          "bg-white/10 dark:bg-slate-900/70 backdrop-blur-[16px]",
          "border border-white/20 dark:border-white/10"
        )}>
          <CardContent className="p-0">
            <h3 className="text-white dark:text-white text-xl font-semibold mb-6 text-center">
              <Shield className="inline mr-2 h-5 w-5" />
              Legal Disclaimer & Fair Use
            </h3>
            
            <div className="space-y-4 text-white/80 dark:text-white/80 text-sm leading-relaxed">
              <p>
                <strong>Important:</strong> This tool is provided for personal, educational, and fair use purposes only. Users are responsible for ensuring their use complies with applicable copyright laws and platform terms of service.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-3">
                  <h4 className="text-white dark:text-white font-semibold flex items-center">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                    Allowed Uses
                  </h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Personal backup of your own content</li>
                    <li>• Educational and research purposes</li>
                    <li>• Fair use under copyright law</li>
                    <li>• Content with explicit permission</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-white dark:text-white font-semibold flex items-center">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                    Prohibited Uses
                  </h4>
                  <ul className="space-y-1 text-sm ml-4">
                    <li>• Commercial redistribution</li>
                    <li>• Copyright infringement</li>
                    <li>• Violating platform terms of service</li>
                    <li>• Downloading private/restricted content</li>
                  </ul>
                </div>
              </div>
              
              <div className={cn(
                "bg-amber-600/20 dark:bg-amber-600/10 border border-amber-600/30 dark:border-amber-600/20",
                "rounded-xl p-4 mt-6"
              )}>
                <p className="text-amber-200 dark:text-amber-300 text-sm">
                  <span className="inline-block w-4 h-4 bg-amber-400 rounded-full mr-2"></span>
                  <strong>Disclaimer:</strong> We are not responsible for how users choose to use downloaded content. Please respect intellectual property rights and follow applicable laws in your jurisdiction.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center space-x-6">
            <Button 
              variant="link" 
              className="text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition-colors p-0"
              data-testid="link-privacy"
            >
              <Shield className="mr-1 h-4 w-4" />
              Privacy Policy
            </Button>
            <Button 
              variant="link" 
              className="text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition-colors p-0"
              data-testid="link-terms"
            >
              <File className="mr-1 h-4 w-4" />
              Terms of Service
            </Button>
            <Button 
              variant="link" 
              className="text-white/70 dark:text-white/70 hover:text-white dark:hover:text-white transition-colors p-0"
              data-testid="link-support"
            >
              <HelpCircle className="mr-1 h-4 w-4" />
              Support
            </Button>
          </div>
          <p className="text-white/50 dark:text-white/50 text-sm">
            © 2024 VideoDownloader Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
