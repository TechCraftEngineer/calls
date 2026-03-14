"use client";

import { Input } from "@calls/ui";
import type { EditUserForm } from "../types";
import { formFieldWrap, formInput, formLabel } from "../types";

interface BasicFieldsProps {
  form: EditUserForm;
  onFormChange: (updates: Partial<EditUserForm>) => void;
}

export function BasicFields({ form, onFormChange }: BasicFieldsProps) {
  return (
    <>
      <div className={formFieldWrap}>
        <label className={formLabel}>Имя *</label>
        <Input
          type="text"
          value={form.givenName}
          onChange={(e) => onFormChange({ givenName: e.target.value })}
          className={formInput}
        />
      </div>
      <div className={formFieldWrap}>
        <label className={formLabel}>Фамилия</label>
        <Input
          type="text"
          value={form.familyName}
          onChange={(e) => onFormChange({ familyName: e.target.value })}
          className={formInput}
        />
      </div>
      <div className={formFieldWrap}>
        <label className={formLabel}>Внутренние номера</label>
        <Input
          type="text"
          value={form.internalExtensions}
          onChange={(e) => onFormChange({ internalExtensions: e.target.value })}
          className={formInput}
          placeholder="101, 102 или admin, ovchinnikov_nikita (МегаФон)"
        />
      </div>
      <div className="mb-4">
        <label className={formLabel}>Мобильные номера</label>
        <Input
          type="text"
          value={form.mobilePhones}
          onChange={(e) => onFormChange({ mobilePhones: e.target.value })}
          className={formInput}
          placeholder="79XXXXXXXXX, можно несколько через запятую"
        />
      </div>
    </>
  );
}
