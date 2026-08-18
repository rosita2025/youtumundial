import { ProductVariant } from '@/lib/data/types';
import { cn } from '@/lib/utils';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
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
          <label className="block text-sm font-medium mb-3">
            {option.name}: <span className="text-muted-foreground">{selectedValues[option.name]}</span>
          </label>
          <div className="flex flex-wrap gap-2">
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
                    'group relative border rounded-md transition-all flex flex-col items-center gap-1 overflow-hidden',
                    variantImage ? 'p-1 min-w-[70px]' : 'px-4 py-2 min-w-[45px]',
                    isSelected
                      ? 'border-foreground ring-1 ring-foreground'
                      : 'border-border bg-background hover:border-foreground/50',
                    !isAvailable && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {variantImage && (
                    <div className="w-14 h-14 overflow-hidden rounded-sm bg-muted mb-1">
                      <img 
                        src={variantImage} 
                        alt={value} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <span className={cn(
                    "text-xs font-medium px-1",
                    variantImage ? "pb-1" : ""
                  )}>
                    {value}
                  </span>
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
