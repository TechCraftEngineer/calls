export interface Employee {
  id: string;
  externalId: string;
  displayName: string;
  extension: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

export interface PhoneNumber {
  id: string;
  externalId: string;
  phoneNumber: string;
  extension: string | null;
  label: string | null;
  lineType: string | null;
  employee: {
    externalId: string;
    displayName: string;
    extension: string | null;
  } | null;
  isActive: boolean;
}
