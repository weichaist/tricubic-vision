import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Database } from "@/database.types";
import { createClient as createServerClient } from "@/utils/supabase/server";

// Creates a Supabase Auth user plus its row in the users table.
// Only signed-in admins may call it.
export async function POST(request: NextRequest) {
  try {
    // Check the caller with their own session (RLS applies)
    const supabase = await createServerClient();
    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("uid", caller.id)
      .maybeSingle();
    if (callerProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create accounts" },
        { status: 403 }
      );
    }

    const { email, password, firstName, lastName, role, companyUid, locationUid } = await request.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !companyUid || !locationUid) {
      return NextResponse.json(
        { error: 'Email, password, first name, last name, company, and location are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'appUser'] as const;
    const userRole: (typeof validRoles)[number] =
      role && validRoles.includes(role) ? role : 'appUser';

    // The service role key is needed to create Auth users; it never leaves the server
    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create a new user
    const { data: user, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the user
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: userRole
      }
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    // Create a record in the users table
    if (user) {
      const { error: profileError } = await admin
        .from('users')
        .insert({
          uid: user.user.id,
          company_uid: companyUid,
          location_uid: locationUid,
          first_name: firstName,
          last_name: lastName,
          role: userRole,
          email: email,
        });

      if (profileError) {
        // If there's an error creating the profile, delete the auth user
        await admin.auth.admin.deleteUser(user.user.id);

        return NextResponse.json(
          { error: `Error creating user profile: ${profileError.message}` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: user?.user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
