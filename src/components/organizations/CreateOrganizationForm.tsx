import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOrganization } from "@/hooks/useCreateOrganization";
import { OrganizationType } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

export const createOrgSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    type: z.nativeEnum(OrganizationType, {
      error: "Please select a type",
    }),
    school_district: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === OrganizationType.School && !data.school_district?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "School District is required for School type",
        path: ["school_district"],
      });
    }
  });

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export function CreateOrganizationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { user } = useAuth();
  const createOrg = useCreateOrganization();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: "",
      type: undefined,
      school_district: "",
    },
  });

  const watchedType = form.watch("type");
  const isSchool = watchedType === OrganizationType.School;

  const onSubmit = async (values: CreateOrgFormValues) => {
    if (!user) return;
    setFormError(null);

    try {
      await createOrg.mutateAsync({
        name: values.name,
        type: values.type,
        school_district: isSchool ? values.school_district || null : null,
        created_by: user.id,
      } as Parameters<typeof createOrg.mutateAsync>[0]);

      toast({
        title: "Organization created",
        description: `"${values.name}" has been created successfully.`,
      });

      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setFormError(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Corp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={OrganizationType.School}>
                      School
                    </SelectItem>
                    <SelectItem value={OrganizationType.Nonprofit}>
                      Nonprofit
                    </SelectItem>
                    <SelectItem value={OrganizationType.Business}>
                      Business
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isSchool && (
          <FormField
            control={form.control}
            name="school_district"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School District</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Springfield Unified" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button
          type="submit"
          disabled={createOrg.isPending}
          className="w-full"
        >
          {createOrg.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating…
            </span>
          ) : (
            "Create Organization"
          )}
        </Button>
      </form>
    </Form>
  );
}
