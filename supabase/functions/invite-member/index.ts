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

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse and validate input
    const body = await req.json();
    const parseResult = inviteSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: parseResult.error.errors[0].message, status: 400 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { organization_id, email } = parseResult.data;

    // 2. Verify caller identity via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header", status: 401 }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", status: 401 }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Service-role client for privileged operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 4. Verify caller owns the organization
    const { data: org, error: orgError } = await serviceClient
      .from("organizations")
      .select("id, name, created_by")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found", status: 404 }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (org.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you do not own this organization", status: 403 }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({ error: "This email has already been invited to this organization", status: 409 }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Generate invite token (expires in 7 days)
    const inviteToken = generateToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // 7. Insert invitation record with token
    const { data: member, error: insertError } = await serviceClient
      .from("organization_members")
      .insert({
        organization_id,
        email,
        status: "invited",
        role: "member",
        invited_at: new Date().toISOString(),
        invite_token: inviteToken,
        token_expires_at: tokenExpiresAt,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "This email has already been invited to this organization", status: 409 }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    // 8. Send invitation email via Resend
    const appUrl = Deno.env.get("APP_URL") ?? "https://admin-dashboard-wun4.vercel.app";
    const inviteUrl = `${appUrl}/accept-invite?token=${inviteToken}`;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "AdminDash <onboarding@resend.dev>",
          to: [email],
          subject: `You've been invited to join ${org.name} on AdminDash`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="margin-bottom: 8px;">You're invited to join <strong>${org.name}</strong></h2>
              <p style="color: #555; margin-bottom: 24px;">
                You've been invited to join <strong>${org.name}</strong> on AdminDash.
                Click the button below to accept your invitation and create your account.
              </p>
              <a href="${inviteUrl}"
                style="display: inline-block; background: #111; color: #fff; padding: 12px 24px;
                       border-radius: 6px; text-decoration: none; font-weight: 600;">
                Accept Invitation
              </a>
              <p style="margin-top: 24px; color: #999; font-size: 13px;">
                This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.
              </p>
              <p style="color: #ccc; font-size: 12px; margin-top: 8px;">
                Or copy this link: ${inviteUrl}
              </p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        console.error("Resend error:", await emailRes.text());
      }
    }

    return new Response(JSON.stringify({ success: true, member }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("invite-member error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: 500 }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
