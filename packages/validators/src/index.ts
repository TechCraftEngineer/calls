// Re-export all validation schemas from their respective files

export {
  type AccountFormValues,
  accountFormSchema,
} from "./account";
export {
  type DataTableItemData,
  dataTableItemSchema,
  type LimitFormData,
  limitFormSchema,
  type TargetFormData,
  targetFormSchema,
} from "./data-table";
export {
  type LoginFormData,
  loginFormSchema,
} from "./login";
export {
  type OTPFormData,
  otpFormSchema,
} from "./otp";
export {
  type ProfileFormValues,
  profileFormSchema,
} from "./profile";
