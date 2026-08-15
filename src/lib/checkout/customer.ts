/**
 * Datos del comprador en el checkout propio.
 *
 * Se valida en el navegador (mensajes claros) y otra vez en el servidor antes
 * de cobrar o de crear el pedido: nunca se confía en lo que manda el cliente.
 */

import { z } from 'zod';

/** Código postal por país: si no está en la lista, pedimos algo genérico. */
const POSTAL_RULES: Record<string, { regex: RegExp; message: string }> = {
  US: { regex: /^\d{5}(-\d{4})?$/, message: 'US ZIP must be 5 digits (e.g. 33101).' },
  CA: {
    regex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    message: 'Canada Postal Code should be like M5V 3L9.',
  },
  PE: { regex: /^\d{5}$/, message: 'Peru Postal Code must be 5 digits (e.g. 15001).' },
  SG: { regex: /^\d{6}$/, message: 'Singapore Postal Code must be 6 digits.' },
};

/** Países donde el estado/provincia es obligatorio para el courier. */
const PROVINCE_REQUIRED = new Set(['US', 'CA']);

const baseCustomerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: 'Enter your first name.' })
    .max(60, { message: 'Name is too long.' }),
  lastName: z
    .string()
    .trim()
    .min(2, { message: 'Enter your last name.' })
    .max(60, { message: 'Last name is too long.' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Enter a valid email.' })
    .max(160, { message: 'Email is too long.' }),
  phone: z
    .string()
    .trim()
    .min(8, { message: 'Enter your phone with country code (e.g. +51 987 654 321).' })
    .max(25, { message: 'Phone number is too long.' })
    .regex(/^\+?[0-9\s().-]{8,25}$/, {
      message: 'Phone can only contain numbers, spaces, and the + sign.',
    })
    .refine((value) => value.replace(/\D/g, '').length >= 8, {
      message: 'Phone number needs at least 8 digits.',
    }),
  address1: z
    .string()
    .trim()
    .min(5, { message: 'Enter the street and number.' })
    .max(200, { message: 'Address is too long.' }),
  address2: z
    .string()
    .trim()
    .max(120, { message: 'Additional info is too long.' })
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, { message: 'Enter your city.' })
    .max(80, { message: 'City is too long.' }),
  province: z
    .string()
    .trim()
    .max(80, { message: 'State/Province is too long.' })
    .optional()
    .or(z.literal('')),
  postalCode: z
    .string()
    .trim()
    .min(3, { message: 'Enter your postal code.' })
    .max(12, { message: 'Postal code is too long.' }),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, { message: 'Select your country.' }),
});

/** Esquema completo con las reglas que dependen del país elegido. */
export const customerSchema = baseCustomerSchema.superRefine((value, ctx) => {
  const country = (value.countryCode || '').toUpperCase();

  // 1. Dirección obligatoria: calle y ciudad deben tener contenido real.
  if (!value.address1?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address1'],
      message: 'Address is required.',
    });
  }

  if (!value.city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['city'],
      message: 'City is required.',
    });
  }

  // 2. Estado/Provincia: obligatorio en ciertos países.
  if (PROVINCE_REQUIRED.has(country) && !value.province?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['province'],
      message: country === 'US' ? 'Enter state (e.g. FL).' : 'Enter province (e.g. ON).',
    });
  }

  // 3. Código postal: validación por formato según país.
  const rule = POSTAL_RULES[country];
  if (rule && !rule.regex.test(value.postalCode)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['postalCode'], message: rule.message });
  } else if (!value.postalCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['postalCode'],
      message: 'Postal code is required.',
    });
  }
});


export type CustomerForm = z.infer<typeof baseCustomerSchema>;

export const emptyCustomer: CustomerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address1: '',
  address2: '',
  city: '',
  province: '',
  postalCode: '',
  countryCode: '',
};

export type CustomerErrors = Partial<Record<keyof CustomerForm, string>>;

/** Valida el formulario y devuelve los errores por campo. */
export function validateCustomer(value: CustomerForm): {
  ok: boolean;
  errors: CustomerErrors;
  data?: CustomerForm;
} {
  const result = customerSchema.safeParse(value);
  if (result.success) return { ok: true, errors: {}, data: result.data };

  const errors: CustomerErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CustomerForm;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** Dirección en una sola línea (para SUP, notas y recibos). */
export function composeAddress(value: CustomerForm): string {
  return [
    value.address1,
    value.address2,
    value.city,
    value.province,
    value.postalCode,
    (value.countryCode || '').toUpperCase(),
  ]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(', ')
    .slice(0, 300);
}

/** Teléfono en formato E.164 aproximado (lo que aceptan Shopify y SUP). */
export function toE164(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

export function fullName(value: Pick<CustomerForm, 'firstName' | 'lastName'>): string {
  return `${value.firstName} ${value.lastName}`.trim();
}

/**
 * Validación mínima de los datos de envío que llegan al servidor en los
 * pedidos (Yape/manual, SUP directo). El navegador ya valida campo por campo,
 * pero acá volvemos a exigir lo indispensable para poder despachar: nombre,
 * correo, teléfono, dirección con calle/ciudad/código postal y país.
 */
export function validateShippingSnapshot(input: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  countryCode?: string;
}): { ok: boolean; message?: string } {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim();
  const phone = String(input.phone ?? '').trim();
  const address = String(input.address ?? '').trim();
  const country = String(input.countryCode ?? '').trim();

  if (name.length < 3 || !name.includes(' ')) return { ok: false, message: 'Missing first and last name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
    return { ok: false, message: 'Invalid email.' };
  }
  if (phone.replace(/\D/g, '').length < 8) return { ok: false, message: 'Missing a valid phone number.' };
  if (address.length < 12 || address.split(',').filter((p) => p.trim()).length < 3) {
    return { ok: false, message: 'Missing full address (street, city, postal code, and country).' };
  }
  if (!/^[A-Za-z]{2}$/.test(country)) return { ok: false, message: 'Missing destination country.' };
  return { ok: true };
}
