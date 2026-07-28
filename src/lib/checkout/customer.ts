/**
 * Datos del comprador en el checkout propio.
 *
 * Se valida en el navegador (mensajes claros) y otra vez en el servidor antes
 * de cobrar o de crear el pedido: nunca se confía en lo que manda el cliente.
 */

import { z } from 'zod';

export const customerSchema = z.object({
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
  address: z
    .string()
    .trim()
    .min(8, { message: 'Escribí tu dirección completa (calle, número, ciudad, código postal).' })
    .max(300, { message: 'La dirección es demasiado larga.' }),
});

export type CustomerForm = z.infer<typeof customerSchema>;

export const emptyCustomer: CustomerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
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

/** Teléfono en formato E.164 aproximado (lo que aceptan Shopify y SUP). */
export function toE164(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

export function fullName(value: Pick<CustomerForm, 'firstName' | 'lastName'>): string {
  return `${value.firstName} ${value.lastName}`.trim();
}
