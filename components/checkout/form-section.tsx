"use client";

import { useActionState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "@repo/ui";
import type { FormState } from "@/app/actions";
import styles from "./checkout-section.module.css";

interface FormSectionProps {
  formId: string;
  title: string;
  description?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
}

const initialState: FormState = { success: false };

export function FormSection({
  formId,
  title,
  description,
  action,
  children,
  submitLabel = "Save",
}: FormSectionProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent>
        {/* The form tag with the formId -- inputs use form={formId} to associate */}
        <form id={formId} action={formAction} />

        <div className={styles.section}>
          {children}

          {state.message && (
            <div
              className={`${styles.statusBanner} ${
                state.success ? styles.statusSuccess : styles.statusError
              }`}
              role="status"
            >
              {state.message}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className={styles.submitRow}>
        <Button type="submit" form={formId} disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
