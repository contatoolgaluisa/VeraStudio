import { z } from 'zod';

/** Regras dos formulários de autenticação (as mensagens aparecem na tela). */

const email = z.email('Informe um e-mail válido');
const password = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(72, 'A senha pode ter no máximo 72 caracteres');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe a senha'),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe seu nome').max(80, 'Use no máximo 80 caracteres'),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'As senhas não são iguais',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'As senhas não são iguais',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  name: z.string().trim().max(80, 'Use no máximo 80 caracteres'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
