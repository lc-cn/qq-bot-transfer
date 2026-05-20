import { z } from "zod";

const qqField = z
  .string()
  .min(5, "QQ 号至少 5 位")
  .max(20, "QQ 号过长")
  .regex(/^\d+$/, "QQ 号须为数字");

const appIdField = z
  .string()
  .min(1)
  .max(64)
  .regex(/^\d+$/, "App ID 须为数字");

export const botCreateSchema = z.object({
  name: z.string().min(1, "请填写 Bot 名称").max(100),
  qq: qqField,
  appId: appIdField,
  clientSecret: z.string().min(1, "请填写 Bot Secret").max(256),
});

export const botUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  qq: qqField.optional(),
  clientSecret: z.string().min(1).max(256).optional(),
});
