import { Shield, Sparkles, CheckCircle2 } from 'lucide-react';

export function ProductCareGuarantee() {
  const items = [
    {
      icon: "🧼",
      title: "Easy-to-Clean Durable Canvas",
      description: "Wipe clean with a damp cloth or hand-wash."
    },
    {
      icon: "🧺",
      title: "Machine Washable Cover",
      description: "Costume cover removes easily and is machine washable."
    },
    {
      icon: "💨",
      title: "Breathable & Odor Resistant",
      description: "Canvas fabric naturally inhibits odors."
    },
    {
      icon: "🛡️",
      title: "1-Year Quality Guarantee",
      description: "Full 1-year guarantee against material defects."
    }
  ];

  return (
    <section className="py-12 px-4 border-t border-border mt-12">
      <div className="max-w-3xl mx-auto bg-[#FBF9F5] rounded-[12px] border border-[#EAE6DF] p-6 md:p-8 space-y-6">
        <h3 className="text-xl font-bold text-center mb-8">Product Care & Quality Guarantee</h3>
        <div className="grid gap-6">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-4">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
