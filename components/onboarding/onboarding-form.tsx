"use client";

// LEGEND: Plug-in onboarding form rendering engine
// Dynamically renders form fields from OnboardingTemplate schemas
// All usage must comply with this LEGEND and the LICENSE

import { getIsoTimestamp } from "@/utils/stamp";
import {
  getFieldsByGroup,
  validateSubmission,
  type OnboardingField,
  type OnboardingFormStatus,
  type OnboardingTemplate,
  type ValidationResult,
} from "@repo/onboarding";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  NativeSelect,
  Separator,
} from "@repo/ui";
import * as React from "react";
import styles from "./onboarding-form.module.css";

/* ── Props ────────────────────────────────────────────────── */
export interface OnboardingFormProps {
  /** The template defining which fields to render */
  template: OnboardingTemplate;
  /** Initial values (e.g. from saved draft) */
  initialValues?: Record<string, string>;
  /** Callback when form is submitted with validated data */
  onSubmit?: (params: {
    templateId: string;
    values: Record<string, string>;
    status: OnboardingFormStatus;
    updatedAt: string;
  }) => void | Promise<void>;
  /** Callback on every field change for observable updates */
  onChange?: (params: {
    key: string;
    value: string;
    allValues: Record<string, string>;
  }) => void;
  /** Whether the form is in a submitting state */
  submitting?: boolean;
  /** Render in read-only mode */
  readOnly?: boolean;
}

/* ── Component ────────────────────────────────────────────── */
export function OnboardingForm(props: OnboardingFormProps) {
  const {
    template,
    initialValues = {},
    onSubmit,
    onChange,
    submitting = false,
    readOnly = false,
  } = props;

  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const field of template.fields) {
      defaults[field.key] =
        initialValues[field.key] ?? field.defaultValue ?? "";
    }
    return defaults;
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [submitted, setSubmitted] = React.useState(false);

  const fieldGroups = React.useMemo(
    () => getFieldsByGroup({ template }),
    [template],
  );

  /* ── Handlers ────────────────────────────────────────────── */
  const handleChange = React.useCallback(
    (params: { key: string; value: string }) => {
      setValues((prev) => {
        const next = { ...prev, [params.key]: params.value };
        onChange?.({ key: params.key, value: params.value, allValues: next });
        return next;
      });
      // Clear error on change
      if (errors[params.key]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[params.key];
          return next;
        });
      }
    },
    [errors, onChange],
  );

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);

      const result: ValidationResult = validateSubmission({
        template,
        values,
      });

      if (!result.valid) {
        const errorMap: Record<string, string> = {};
        for (const err of result.errors) {
          errorMap[err.key] = err.message;
        }
        setErrors(errorMap);
        return;
      }

      setErrors({});
      await onSubmit?.({
        templateId: template.id,
        values,
        status: "submitted",
        updatedAt: getIsoTimestamp(),
      });
    },
    [template, values, onSubmit],
  );

  /* ── Group Label Formatting ──────────────────────────────── */
  const formatGroupLabel = (group: string) =>
    group
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
        {template.docsUrl && (
          <a
            href={template.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.docsLink}
          >
            Documentation →
          </a>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent>
          {Array.from(fieldGroups.entries()).map(
            ([groupName, fields], groupIdx) => (
              <div key={groupName} className={styles.group}>
                {groupIdx > 0 && <Separator />}
                <h3 className={styles.groupTitle}>
                  {formatGroupLabel(groupName)}
                </h3>
                <div className={styles.fieldGrid}>
                  {fields.map((field) => (
                    <OnboardingFieldRenderer
                      key={field.key}
                      field={field}
                      value={values[field.key] ?? ""}
                      error={submitted ? errors[field.key] : undefined}
                      onChange={handleChange}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            ),
          )}

          {template.regions.length > 0 &&
            !template.regions.includes("global") && (
              <div className={styles.regionBadges}>
                {template.regions.map((r) => (
                  <span key={r} className={styles.badge}>
                    {r}
                  </span>
                ))}
              </div>
            )}
        </CardContent>

        {!readOnly && (
          <CardFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Onboarding"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}

/* ── Individual Field Renderer ────────────────────────────── */
interface FieldRendererProps {
  field: OnboardingField;
  value: string;
  error?: string;
  onChange: (params: { key: string; value: string }) => void;
  readOnly?: boolean;
}

function OnboardingFieldRenderer(props: FieldRendererProps) {
  const { field, value, error, onChange, readOnly } = props;

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    onChange({ key: field.key, value: e.target.value });
  };

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    onChange({ key: field.key, value: checked === true ? "true" : "false" });
  };

  if (field.type === "hidden") {
    return <input type="hidden" name={field.key} value={value} />;
  }

  return (
    <FormField
      name={field.key}
      label={field.label}
      description={field.description}
      error={error}
    >
      {field.type === "select" && field.options ? (
        <NativeSelect
          id={field.key}
          name={field.key}
          options={field.options}
          value={value}
          onChange={handleInputChange}
          disabled={readOnly}
          placeholder={field.placeholder}
        />
      ) : field.type === "checkbox" ? (
        <Checkbox
          id={field.key}
          name={field.key}
          checked={value === "true"}
          onCheckedChange={handleCheckboxChange}
          disabled={readOnly}
        />
      ) : field.type === "textarea" ? (
        <textarea
          id={field.key}
          name={field.key}
          value={value}
          onChange={handleInputChange}
          placeholder={field.placeholder}
          required={field.required}
          readOnly={readOnly}
          className={styles.textarea}
          rows={4}
        />
      ) : (
        <Input
          id={field.key}
          name={field.key}
          type={field.type}
          value={value}
          onChange={handleInputChange}
          placeholder={field.placeholder}
          required={field.required}
          readOnly={readOnly}
          pattern={field.pattern}
          title={field.patternMessage}
          hasError={!!error}
        />
      )}
    </FormField>
  );
}
