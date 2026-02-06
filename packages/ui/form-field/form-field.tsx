import * as React from "react";
import { cn } from "../lib/utils";
import { Label } from "../label/label";
import styles from "./form-field.module.scss";

export interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  error?: string;
  className?: string;
  /** formId to associate with external <form> via form attribute */
  formId?: string;
  children: React.ReactNode;
}

function FormField({
  name,
  label,
  description,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn(styles.field, className)}>
      <Label htmlFor={name} hasError={!!error}>
        {label}
      </Label>
      {children}
      {description && !error && (
        <p className={styles.message}>{description}</p>
      )}
      {error && (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
