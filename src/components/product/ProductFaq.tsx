import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What size should I choose?',
    answer:
      'Each product includes a size guide in the variant selector. We recommend measuring your favorite garment and comparing it to the chart. If you are between sizes, choose the larger one for a relaxed fit.',
  },
  {
    question: 'How long does shipping take?',
    answer:
      'Orders are prepared in 3-4 business days. After dispatch, delivery takes 10-15 business days depending on your country. Singapore customers receive free delivery in 3-5 days.',
  },
  {
    question: 'Can I return it if it does not fit?',
    answer:
      'Yes. We offer a 7-day money-back guarantee for unused items with original tags. Contact us through the contact page or reply to your order confirmation email to start a return.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept Visa, Mastercard, American Express, PayPal, Apple Pay, Google Pay and other secure Stripe methods. All transactions are protected by 256-bit SSL encryption.',
  },
  {
    question: 'Will I pay customs or import taxes?',
    answer:
      'Prices do not include customs duties or import taxes. These are determined by your country and are the buyer\'s responsibility. We ship worldwide with tracked delivery.',
  },
];

export function ProductFaq() {
  return (
    <div className="border border-border rounded-lg p-5 md:p-6 bg-card/30">
      <h3 className="font-heading text-lg mb-4">Frequently Asked Questions</h3>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-sm">{faq.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-sm">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
