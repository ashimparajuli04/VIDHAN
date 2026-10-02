import { ZAuthRegister } from "@vidhan/schema";
import { z } from "zod/v4";

export const ZRegisterForm = ZAuthRegister.extend({
  confirmPassword: z.string().min(1, "Confirm your password."),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export type TRegisterFormInput = z.input<typeof ZRegisterForm>;
export type TRegisterFormOutput = z.output<typeof ZRegisterForm>;
