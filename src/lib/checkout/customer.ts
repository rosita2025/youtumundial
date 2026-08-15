/**
 * Datos del comprador en el checkout propio.
 *
 * Se valida en el navegador (mensajes claros) y otra vez en el servidor antes
 * de cobrar o de crear el pedido: nunca se confía en lo que manda el cliente.
 */

import { z } from 'zod';

/** Código postal por país: si no está en la lista, pedimos algo genérico. */
const POSTAL_RULES: Record<string, { regex: RegExp; message: string }> = {
  US: { regex: /^\d{5}(-\d{4})?$/, message: 'El ZIP de EE. UU. tiene 5 dígitos (ej. 33101).' },
  CA: {
    regex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    message: 'El código postal de Canadá es tipo M5V 3L9.',
  },
  PE: { regex: /^\d{5}$/, message: 'El código postal de Perú tiene 5 dígitos (ej. 15001).' },
};

/** Países donde el estado/provincia es obligatorio para el courier. */
const PROVINCE_REQUIRED = new Set(['US', 'CA']);

const baseCustomerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: 'Escribí tu nombre.' })
    .max(60, { message: 'El nombre es demasiado largo.' }),
  lastName: z
    .string()
    .trim()
    .min(2, { message: 'Escribí tu apellido.' })
    .max(60, { message: 'El apellido es demasiado largo.' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Escribí un correo válido.' })
    .max(160, { message: 'El correo es demasiado largo.' }),
  phone: z
    .string()
    .trim()
    .min(8, { message: 'Escribí tu teléfono con código de país (ej. +51 987 654 321).' })
    .max(25, { message: 'El teléfono es demasiado largo.' })
    .regex(/^\+?[0-9\s().-]{8,25}$/, {
      message: 'El teléfono solo puede tener números, espacios y el signo +.',
    })
    .refine((value) => value.replace(/\D/g, '').length >= 8, {
      message: 'El teléfono necesita al menos 8 dígitos.',
    }),
  address1: z
    .string()
    .trim()
    .min(5, { message: 'Escribí la calle y el número.' })
    .max(200, { message: 'La dirección es demasiado larga.' }),
  address2: z
    .string()
    .trim()
    .max(120, { message: 'El dato adicional es demasiado largo.' })
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, { message: 'Escribí tu ciudad.' })
    .max(80, { message: 'La ciudad es demasiado larga.' }),
  province: z
    .string()
    .trim()
    .max(80, { message: 'El estado/provincia es demasiado largo.' })
    .optional()
    .or(z.literal('')),
  postalCode: z
    .string()
    .trim()
    .min(3, { message: 'Escribí tu código postal.' })
    .max(12, { message: 'El código postal es demasiado largo.' }),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, { message: 'Elegí el país de destino.' }),
});

/** Esquema completo con las reglas que dependen del país elegido. */
export const customerSchema = baseCustomerSchema.superRefine((value, ctx) => {
  const country = (value.countryCode || '').toUpperCase();

  // 1. Dirección obligatoria: calle y ciudad deben tener contenido real.
  if (!value.address1?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['address1'],
      message: 'La dirección es obligatoria.',
    });
  }

  if (!value.city?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['city'],
      message: 'La ciudad es obligatoria.',
    });
  }

  // 2. Estado/Provincia: obligatorio en ciertos países.
  if (PROVINCE_REQUIRED.has(country) && !value.province?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['province'],
      message: country === 'US' ? 'Escribí el estado (ej. FL).' : 'Escribí la provincia (ej. ON).',
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
      message: 'El código postal es obligatorio.',
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

  if (name.length < 3 || !name.includes(' ')) return { ok: false, message: 'Falta el nombre y apellido.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) {
    return { ok: false, message: 'El correo no es válido.' };
  }
  if (phone.replace(/\D/g, '').length < 8) return { ok: false, message: 'Falta un teléfono válido.' };
  if (address.length < 12 || address.split(',').filter((p) => p.trim()).length < 3) {
    return { ok: false, message: 'Falta la dirección completa (calle, ciudad, código postal y país).' };
  }
  if (!/^[A-Za-z]{2}$/.test(country)) return { ok: false, message: 'Falta el país de destino.' };
  return { ok: true };
}
