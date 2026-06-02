import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInviteMember } from "@/hooks/useInviteMember";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";

interface InviteMemberFormProps {
  organizationId: string;
}

export const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const inviteMember = useInviteMember();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: InviteFormValues) => {
    setFormError(null);

    try {
      await inviteMember.mutateAsync({
        organization_id: organizationId,
        email: values.email,
      });

      toast({
        title: "Invitation sent",
        description: `${values.email} has been invited.`,
      });

      form.reset();
    } catch (err: unknown) {
      const error = err as Error & { status?: number };
      // On 409 (duplicate): show error WITHOUT resetting form so admin can see the email
      setFormError(error.message ?? "Something went wrong");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Invite by Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={inviteMember.isPending} className="w-full">
          {inviteMember.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending…
            </span>
          ) : (
            "Send Invitation"
          )}
        </Button>
      </form>
    </Form>
  );
}
