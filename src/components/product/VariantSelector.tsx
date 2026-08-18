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

function cleanVariantLabel(value: string, isHeader = false): string {
  const lower = value.toLowerCase();
  
  // Custom mapping for sizes
  if (lower.includes('catty')) {
    if (lower.includes('1-6')) return 'M';
    if (lower.includes('7-15')) return 'L';
  }

  // Handle common color names
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

function getSizeSubtitle(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('catty')) {
    if (lower.includes('1-6')) return 'Recommended 0.5–3kg dogs / 0–4kg cats';
    if (lower.includes('7-15')) return 'Recommended for dogs under 6kg / cats under 8kg';
  }
  return '';
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
    <div className="space-y-[16px]">
      {uniqueOptions.map((option) => (
        <div key={option.name}>
          <label className="block text-sm font-bold uppercase tracking-wider text-foreground/80 mb-3">
            {option.name === 'Color' ? 'COLORS' : option.name}: <span className="text-primary font-bold">{cleanVariantLabel(selectedValues[option.name] || '', true)}</span>
          </label>
          <div className="flex flex-wrap gap-2 justify-start max-w-full overflow-hidden">
            {option.values.map((value) => {
              const isSelected = selectedValues[option.name] === value;
              const isAvailable = isValueAvailable(option.name, value);

              const isSize = option.name.toLowerCase().includes('size');

              return (
                <button
                  key={value}
                  onClick={() => handleSelect(option.name, value)}
                  disabled={!isAvailable}
                  className={cn(
                    'group relative border rounded-full transition-all flex items-center justify-center overflow-hidden shrink-0',
                    !isSize ? 'w-[44px] h-[44px] p-0.5' : 'px-4 py-2.5 flex-1 min-w-[140px]',
                    isSelected
                      ? isSize 
                        ? 'border-[#1B4D3E] bg-[#FBF9F5] ring-1 ring-[#1B4D3E] z-10' 
                        : 'border-primary ring-2 ring-primary ring-offset-2 scale-110 z-10'
                      : isSize
                        ? 'border-[#EAE6DF] bg-white text-muted-foreground'
                        : 'border-border bg-background hover:border-foreground/30',
                    !isAvailable && 'opacity-30 cursor-not-allowed'
                  )}
                  title={value}
                >
                  {!isSize ? (
                    <div className="w-full h-full overflow-hidden rounded-full bg-muted relative">
                      {(() => {
                        const exampleVariant = variants.find(v => 
                          v.options.some(o => o.name === option.name && o.value === value)
                        );
                        return exampleVariant?.image?.url ? (
                          <img 
                            src={exampleVariant.image.url} 
                            alt={value} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 pointer-events-none"
                            referrerPolicy="no-referrer"
                            onContextMenu={(e) => e.preventDefault()}
                            draggable={false}
                          />
                        ) : null;
                      })()}
                      <div className="absolute inset-0 bg-transparent" onContextMenu={(e) => e.preventDefault()} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "text-[12px] px-2 text-center leading-tight transition-colors",
                        isSelected ? "font-bold text-[#1B4D3E]" : "font-medium"
                      )}>
                        {cleanVariantLabel(value)}
                      </span>
                      <span className="text-[9px] text-muted-foreground/80 mt-0.5 px-2 text-center">
                        {getSizeSubtitle(value)}
                      </span>
                    </div>
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
