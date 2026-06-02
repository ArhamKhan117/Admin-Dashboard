import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const inviteSchema = z.object({
  organization_id: z.string().uuid("organization_id must be a valid UUID"),
  email: z.string().email("email must be a valid email address"),
});

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and validate input
    const body = await req.json();
    const parseResult = inviteSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: parseResult.error.errors[0].message,
          status: 400,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const { organization_id, email } = parseResult.data;

    // 2. Verify caller identity via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header", status: 401 }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Caller client — uses the user's JWT so auth.uid() resolves correctly
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", status: 401 }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Use the service-role client for privileged DB operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Verify caller owns the organization
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, created_by")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found", status: 404 }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (org.created_by !== user.id) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: you do not own this organization",
          status: 403,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Check for duplicate invitation
    const { data: existing } = await serviceClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", organization_id)
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "This email has already been invited to this organization",
          status: 409,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Insert invitation record
    const { data: member, error: insertError } = await serviceClient
      .from("organization_members")
      .insert({
        organization_id,
        email,
        status: "invited",
        role: "member",
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // Unique constraint violation — race condition fallback
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({
            error: "This email has already been invited to this organization",
            status: 409,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      throw insertError;
    }

    // TODO: Integrate email delivery service here (e.g., Resend, SendGrid, Postmark).
    // Call the email provider API with the invitee's email address and a generated
    // invitation link. Example:
    //   await sendInvitationEmail({ to: email, orgName: org.name, inviteUrl: "..." });

    return new Response(JSON.stringify({ success: true, member }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invite-member error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: 500 }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
