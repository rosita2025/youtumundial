import { ProductVariant } from '@/lib/data/types';
import { cn } from '@/lib/utils';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
}

const CLEAN_LABELS: Record<string, string> = {
  'bee': 'Bee',
  'lion': 'Lion',
  'rabbit': 'Rabbit',
  'mickey': 'Black Mickey',
  'burger': 'Burger',
  'hamburger': 'Burger',
  'dinosaur': 'Dino',
  'frog': 'Frog',
  '381bqiqi': 'Mickey',
  'bag': 'Bag',
  'bags': 'Bags',
};

function cleanVariantLabel(value: string): string {
  const lower = value.toLowerCase();
  
  // Custom mapping for sizes to be more user friendly
  if (lower.includes('catty')) {
    if (lower.includes('1-6')) return 'Size M: Pets up to 7 lbs (3.5 kg)';
    if (lower.includes('7-15')) return 'Size L: Pets up to 15 lbs (7 kg)';
    return value.replace(/16catty/i, '').replace(/catty/i, ' lbs capacity');
  }

  for (const [key, label] of Object.entries(CLEAN_LABELS)) {
    if (lower.includes(key)) return label;
  }
  
  // Handle technical color labels
  let clean = value.replace(/^\d+\s+/, '') // Remove leading numbers
                   .replace(/[a-z0-9]+bag/i, '') // Remove bag codes
                   .replace(/color/i, '')
                   .trim();
                   
  return clean || value;
}

export function VariantSelector({
  variants,
  selectedVariant,
  onSelect,
}: VariantSelectorProps) {
  // Group variants by option name
  const optionGroups = variants.reduce<Record<string, Set<string>>>((acc, variant) => {
    variant.options.forEach((option) => {
      if (!acc[option.name]) {
        acc[option.name] = new Set();
      }
      acc[option.name].add(option.value);
    });
    return acc;
  }, {});

  // Get unique values for each option
  const uniqueOptions = Object.entries(optionGroups).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));

  // Track selected values for each option
  const selectedValues: Record<string, string> = {};
  if (selectedVariant) {
    selectedVariant.options.forEach((option) => {
      selectedValues[option.name] = option.value;
    });
  }

  // Find variant matching selections
  const findVariant = (newValues: Record<string, string>): ProductVariant | undefined => {
    return variants.find((variant) =>
      variant.options.every((option) => newValues[option.name] === option.value)
    );
  };

  // Handle option selection
  const handleSelect = (optionName: string, value: string) => {
    const newValues = { ...selectedValues, [optionName]: value };
    const variant = findVariant(newValues);
    if (variant) {
      onSelect(variant);
    }
  };

  // Check if an option value is available
  const isValueAvailable = (optionName: string, value: string): boolean => {
    const testValues = { ...selectedValues, [optionName]: value };
    const variant = findVariant(testValues);
    return variant?.available ?? false;
  };

  return (
    <div className="space-y-6">
      {uniqueOptions.map((option) => (
        <div key={option.name}>
          <label className="block text-sm font-bold uppercase tracking-wider text-foreground/80 mb-3">
            {option.name === 'Color' ? 'COLORS' : option.name}: <span className="text-primary font-bold">{cleanVariantLabel(selectedValues[option.name] || '')}</span>
          </label>
          <div className="flex flex-wrap gap-2 justify-start max-w-full overflow-hidden">
            {option.values.map((value) => {
              const isSelected = selectedValues[option.name] === value;
              const isAvailable = isValueAvailable(option.name, value);

              // Find a variant that has this option value to potentially show its image
              const exampleVariant = variants.find(v => 
                v.options.some(o => o.name === option.name && o.value === value)
              );
              const variantImage = exampleVariant?.image?.url;

              return (
                <button
                  key={value}
                  onClick={() => handleSelect(option.name, value)}
                  disabled={!isAvailable}
                  className={cn(
                    'group relative border rounded-full transition-all flex items-center justify-center overflow-hidden shrink-0',
                    variantImage ? 'w-[44px] h-[44px] p-0.5' : 'px-4 py-2 min-w-[45px]',
                    isSelected
                      ? 'border-primary ring-2 ring-primary ring-offset-2 scale-110 z-10'
                      : 'border-border bg-background hover:border-foreground/30',
                    !isAvailable && 'opacity-30 cursor-not-allowed'
                  )}
                  title={value}
                >
                  {variantImage ? (
                    <div className="w-full h-full overflow-hidden rounded-full bg-muted relative">
                      <img 
                        src={variantImage} 
                        alt={value} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110 pointer-events-none"
                        referrerPolicy="no-referrer"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2 text-center leading-tight">
                      {cleanVariantLabel(value)}
                    </span>
                  )}
                  
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  )}

                  {!isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-[1px] bg-muted-foreground/40 rotate-45" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
