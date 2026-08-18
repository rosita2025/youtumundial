import { Shield, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

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

        {/* Trust Badges & Checkout Guarantees */}
        <div className="pt-8 border-t border-[#EAE6DF] mt-8">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="w-4 h-4 bg-[#00B67A] flex items-center justify-center rounded-[1px]">
                    <span className="text-white text-[10px]">★</span>
                  </div>
                ))}
              </div>
              <span className="text-sm font-black tracking-tight text-[#111111]">
                Trustpilot <span className="font-normal text-muted-foreground ml-1">Excellent 4.9 / 5</span>
              </span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
              <div className="flex flex-col items-center gap-1.5">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Secure SSL</span>
              </div>
              <img src="https://img.icons8.com/color/48/visa.png" alt="Visa" className="h-5 w-auto" />
              <img src="https://img.icons8.com/color/48/mastercard.png" alt="Mastercard" className="h-5 w-auto" />
              <img src="https://img.icons8.com/color/48/paypal.png" alt="PayPal" className="h-5 w-auto" />
              <div className="flex flex-col items-center gap-1.5">
                <RotateCcw className="h-5 w-5 text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-widest">30-Day Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
