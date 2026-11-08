import { httpsCallable } from "firebase/functions";
import { createClient } from "@/utils/supabase/client";
import { functions } from "./config";

export interface DebugClipAnalysisResult {
  success: boolean;
  rulesCount?: number;
  durationMs?: number;
  response?: string;
  error?: string;
}

/**
 * Re-runs the Gemini analysis for one clip (Cloud Function `debugClipAnalysis`)
 * and returns the raw model output. The function checks the caller's Supabase
 * session, so the current access token is sent along; only admins and
 * managers may call it.
 */
export async function debugClipAnalysis(data: {
  videoUrl: string;
  locationUid?: string | null;
  companyUid: string;
}): Promise<DebugClipAnalysisResult> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const callable = httpsCallable<
      typeof data & { accessToken?: string },
      DebugClipAnalysisResult
    >(functions, "debugClipAnalysis", {
      timeout: 540000, // 9 minutes, the function's limit
    });
    const result = await callable({ ...data, accessToken: session?.access_token });
    return result.data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
