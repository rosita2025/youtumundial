import { Sparkles, WashingMachine, Wind, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductCareGuarantee() {
  const points = [
    {
      icon: <Sparkles className="text-primary w-5 h-5" />,
      title: "Easy-to-Clean Durable Canvas",
      description: "Wipe clean with a damp cloth or hand-wash for deeper cleaning. Re-shape and air dry."
    },
    {
      icon: <WashingMachine className="text-primary w-5 h-5" />,
      title: "Machine Washable Cover",
      description: "Costume cover removes easily and is machine washable on gentle cycle."
    },
    {
      icon: <Wind className="text-primary w-5 h-5" />,
      title: "Breathable & Odor Resistant",
      description: "Canvas fabric naturally inhibits odors and keeps your pet comfortable."
    },
    {
      icon: <ShieldCheck className="text-primary w-5 h-5" />,
      title: "1-Year Quality Guarantee",
      description: "We stand by our product with a comprehensive 1-year guarantee against material defects."
    }
  ];

  return (
    <section className="container-wide my-12 md:my-16">
      <div 
        className="bg-[#FBF9F5] border border-[#EAE6DF] rounded-[12px] p-4 md:p-6"
      >
        <h2 className="text-[20px] font-bold mb-6 text-foreground">
          Product Care & Quality Guarantee
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {points.map((point, index) => (
            <div key={index} className="flex gap-4 items-start">
              <div className="shrink-0 mt-1">
                {point.icon}
              </div>
              <div>
                <h3 className="font-bold text-[14px] leading-tight mb-1">
                  {point.title}
                </h3>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}