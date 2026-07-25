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

              return (
                <button
                  key={value}
                  onClick={() => handleSelect(option.name, value)}
                  disabled={!isAvailable}
                  className={cn(
                    'px-4 py-2 border rounded-md text-sm font-medium transition-all',
                    isSelected
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-background hover:border-foreground',
                    !isAvailable && 'opacity-40 cursor-not-allowed line-through'
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
