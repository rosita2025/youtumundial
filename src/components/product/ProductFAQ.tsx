import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "What is the carrier bag designed for?",
    answer: "This pet carrier tote is designed to bring your cat or small pet along on outdoor adventures comfortably. It features a head-out opening so your pet can enjoy fresh air and view the surroundings while remaining safe and close to you."
  },
  {
    question: "Is the bag safe and comfortable for my pet?",
    answer: "Yes. Made from durable, high-density canvas fabric, every bag includes a sturdy base and reinforced stitching to ensure a secure space. It accommodates pets up to 7 lbs (3.5 kg) comfortably."
  },
  {
    question: "How does shipping work? Is shipping free?",
    answer: "We process and ship orders within 24-48 hours. Standard International Shipping applies to single bag orders ($43.99). We offer FREE International Shipping on all orders over $50.00 USD (automatically unlocked when purchasing Buy 2 or Buy 3 bundles)."
  },
  {
    question: "What is your return policy?",
    answer: "We offer a hassle-free 30-day return policy. If you or your pet are not 100% satisfied with your purchase, simply contact our support team and we will guide you through our stress-free return process."
  },
  {
    question: "How do I clean and care for the bag?",
    answer: "The carrier is low-maintenance! You can wipe it clean with a damp cloth or hand-wash it for deeper cleaning. Air dry naturally to preserve the shape and fabric quality."
  }
];

export function ProductFAQ() {
  return (
    <section className="bg-[#FBF9F5] py-16 px-4 md:px-0 border-t border-border/50 pb-[100px]">
      <div className="container-wide max-w-3xl mx-auto">
        <h2 className="text-[22px] font-bold text-[#111111] text-center mb-10">
          Frequently Asked Questions
        </h2>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border-[#EAE6DF] border rounded-[8px] px-4 bg-white overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="hover:no-underline py-4 text-left font-bold text-[#111111] [&[data-state=open]>svg]:hidden group">
                <div className="flex justify-between items-center w-full pr-4">
                  <span>{item.question}</span>
                  <div className="shrink-0 flex items-center justify-center">
                    <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:hidden" />
                    <ChevronUp className="h-4 w-4 text-muted-foreground hidden group-data-[state=open]:block" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-4 pt-0">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
