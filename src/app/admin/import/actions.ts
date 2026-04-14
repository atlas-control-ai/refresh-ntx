"use server";

import { createClient } from "@/lib/supabase/server";

export interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
}

// Maps the actual spreadsheet columns
interface SpreadsheetRow {
  "Submission Date": string;
  "Parent or Guardian's Name  - First Name": string;
  "Parent or Guardian's Name  - Last Name": string;
  "Email": string;
  "Cell Phone Number": string;
  "Child's Name - First Name": string;
  "Child's Name - Last Name": string;
  "Student ID": string;
  "Child's Date of Birth": string;
  "Grade for the 2025 - 2026 School Year": string;
  "School District": string;
  "Frisco ISD Schools": string;
  "Little Elm ISD Schools": string;
  "Denton ISD Schools": string;
  "North Texas Collegiate Academy": string;
  "Other Schools": string;
  "Does this child prefer extra moisturizing products for coarse/coily hair?": string;
  "Product Preference": string;
  "Menstruation Product Preference": string;
  "Your Zip Code": string;
  "Your County": string;
  "Gender of Child": string;
  "Ethnicity of Child (Select all that apply)": string;
  "Pack Code": string;
  "Refresh ID": string;
  "Notes": string;
  "Possible Student Name Duplicates": string;
  "Aug Pick Up": string;
  "Nov Pick Up": string;
  "Feb Pick Up": string;
  "May Pick Up": string;
  "Aug Pickup Timestamp": string;
  "Nov Pickup Timestamp": string;
  "Feb Pickup Timestamp": string;
  "May Pickup Timestamp": string;
  "Aug School Delivery": string;
  "Nov School Delivery": string;
  "Feb School Delivery": string;
  "May School Delivery": string;
  "Aug School Delivery Timestamp": string;
  "Nov School Delivery Timestamp": string;
  "Feb School Delivery Timestamp": string;
  "May School Delivery Timestamp": string;
  "Aug Bin": string;
  "Nov Bin": string;
  "Feb Bin": string;
  "May Bin": string;
  "Aug Bin Timestamp": string;
  "Nov Bin Timestamp": string;
  "Feb Bin Timestamp": string;
  "May Bin Timestamp": string;
  "Unenrolled": string;
  "Unenrolled Timestamp": string;
  "Duplicate": string;
  [key: string]: string;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return "2010-01-01";
  // Handle MM-DD-YYYY format
  const mdyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (mdyMatch) {
    return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, "0")}-${mdyMatch[2].padStart(2, "0")}`;
  }
  // Handle MM/DD/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
  }
  // Handle YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  return "2010-01-01";
}

function parseTimestamp(dateStr: string): string | null {
  if (!dateStr) return null;
  // Handle M/D/YYYY or MM/DD/YYYY
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}T00:00:00Z`;
  }
  // Handle YYYY-MM-DD with optional time
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00Z`;
  }
  return null;
}

function isTruthy(val: string): boolean {
  return val?.toUpperCase() === "TRUE" || val?.toLowerCase() === "yes";
}

function getSchoolName(row: SpreadsheetRow): string {
  const district = row["School District"] || "";
  if (district === "Frisco ISD" && row["Frisco ISD Schools"])
    return row["Frisco ISD Schools"];
  if (district === "Little Elm ISD" && row["Little Elm ISD Schools"])
    return row["Little Elm ISD Schools"];
  if (district === "Denton ISD" && row["Denton ISD Schools"])
    return row["Denton ISD Schools"];
  if (district.includes("Collegiate") && row["North Texas Collegiate Academy"])
    return row["North Texas Collegiate Academy"];
  if (row["Other Schools"]) return row["Other Schools"];
  // Fallback: check all school columns
  return (
    row["Frisco ISD Schools"] ||
    row["Little Elm ISD Schools"] ||
    row["Denton ISD Schools"] ||
    row["North Texas Collegiate Academy"] ||
    row["Other Schools"] ||
    "Unknown"
  );
}

function parseGender(row: SpreadsheetRow): string {
  const gender = row["Gender of Child"] || "";
  if (gender === "Male" || gender === "Female") return gender;
  if (gender === "Non-binary") return "Non-binary";
  // Also parse from Product Preference
  const pref = row["Product Preference"] || "";
  if (pref.toLowerCase().includes("male") && !pref.toLowerCase().includes("female"))
    return "Male";
  if (pref.toLowerCase().includes("female")) return "Female";
  return gender || "Prefer not to say";
}

function parseMenstruationPref(row: SpreadsheetRow): string | null {
  const pref = row["Menstruation Product Preference"] || "";
  if (pref === "Pads" || pref.toLowerCase().includes("pad")) return "Pads";
  if (pref === "Tampons" || pref.toLowerCase().includes("tampon")) return "Tampons";
  if (pref === "None" || pref.toLowerCase().includes("none")) return "None";
  return null;
}

export async function importSpreadsheet(
  rows: SpreadsheetRow[],
  cycleIds: { aug: string; nov: string; feb?: string; may?: string }
): Promise<ImportResult> {
  const supabase = await createClient();
  const result: ImportResult = {
    total: rows.length,
    created: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
    errorMessages: [],
  };

  // First, reset the refresh_id sequence to accommodate imported IDs
  // Find the max Refresh ID in the CSV
  let maxRefreshId = 1000;
  for (const row of rows) {
    const rid = parseInt(row["Refresh ID"], 10);
    if (!isNaN(rid) && rid > maxRefreshId) maxRefreshId = rid;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const firstName = row["Child's Name - First Name"]?.trim();
      const lastName = row["Child's Name - Last Name"]?.trim();

      if (!firstName || !lastName) {
        result.skipped++;
        continue;
      }

      const gender = parseGender(row);
      const ethnicHair = isTruthy(
        row["Does this child prefer extra moisturizing products for coarse/coily hair?"]
      );
      const ethnicity = (row["Ethnicity of Child (Select all that apply)"] || "")
        .split(";")
        .map((e) => e.trim())
        .filter(Boolean);
      const isDuplicate = isTruthy(row["Duplicate"]);
      const isUnenrolled = isTruthy(row["Unenrolled"]);
      const refreshId = parseInt(row["Refresh ID"], 10) || undefined;

      // Insert student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: parseDate(row["Child's Date of Birth"]),
          school_student_id: row["Student ID"]?.trim() || null,
          gender,
          ethnicity,
          ethnic_hair_preference: ethnicHair,
          is_duplicate: isDuplicate,
          is_unenrolled: isUnenrolled,
          unenrolled_at: isUnenrolled && row["Unenrolled Timestamp"]
            ? parseTimestamp(row["Unenrolled Timestamp"])
            : null,
          notes: row["Notes"]?.trim() || null,
          ...(refreshId ? { refresh_id: refreshId } : {}),
        })
        .select("id, refresh_id")
        .single();

      if (studentError) {
        result.errors++;
        result.errorMessages.push(`Row ${rowNum} (${firstName} ${lastName}): ${studentError.message}`);
        continue;
      }

      if (isDuplicate) result.duplicates++;

      // Insert guardian
      const guardianFirst = row["Parent or Guardian's Name  - First Name"]?.trim();
      const guardianLast = row["Parent or Guardian's Name  - Last Name"]?.trim();
      const email = row["Email"]?.trim();

      if (guardianFirst && email) {
        await supabase.from("guardians").insert({
          student_id: student.id,
          first_name: guardianFirst,
          last_name: guardianLast || guardianFirst,
          email,
          phone: row["Cell Phone Number"]?.trim() || "",
          zip_code: row["Your Zip Code"]?.trim() || "",
          county: row["Your County"]?.trim() || "",
          is_primary: true,
        });
      }

      // Create enrollments per cycle with distribution data
      const schoolDistrict = row["School District"] || "Other";
      const schoolName = getSchoolName(row);
      const grade = row["Grade for the 2025 - 2026 School Year"] || "K";
      const packCode = row["Pack Code"] || "0";
      const menstruationPref = parseMenstruationPref(row);
      const submittedAt = row["Submission Date"]
        ? row["Submission Date"].includes("T")
          ? row["Submission Date"]
          : `${row["Submission Date"].replace(" ", "T")}Z`
        : new Date().toISOString();

      const seasons = [
        { key: "aug", cycleId: cycleIds.aug },
        { key: "nov", cycleId: cycleIds.nov },
        { key: "feb", cycleId: cycleIds.feb },
        { key: "may", cycleId: cycleIds.may },
      ] as const;

      for (const { key, cycleId } of seasons) {
        if (!cycleId) continue;

        // Check if there's any distribution activity for this season
        const prefix = key.charAt(0).toUpperCase() + key.slice(1);
        const hasPickup = isTruthy(row[`${prefix} Pick Up`]);
        const hasSchoolDel = isTruthy(row[`${prefix} School Delivery`]);
        const hasBin = isTruthy(row[`${prefix} Bin`]);
        const pickupTs = row[`${prefix} Pickup Timestamp`];
        const schoolDelTs = row[`${prefix} School Delivery Timestamp`];
        const binTs = row[`${prefix} Bin Timestamp`];

        // Only create enrollment for Aug cycle (primary) or if there's distribution data for other cycles
        const isPrimary = key === "aug";
        const hasActivity = hasPickup || hasSchoolDel || hasBin || pickupTs || schoolDelTs || binTs;

        if (!isPrimary && !hasActivity) continue;

        const { data: enrollment, error: enrollError } = await supabase
          .from("enrollments")
          .insert({
            student_id: student.id,
            cycle_id: cycleId,
            pack_code: packCode,
            grade,
            menstruation_preference: menstruationPref,
            school_district: schoolDistrict,
            school_name: schoolName,
            submitted_at: submittedAt,
          })
          .select("id")
          .single();

        if (enrollError || !enrollment) continue;

        // Insert distribution records
        const distInserts: Array<{
          enrollment_id: string;
          method: string;
          completed: boolean;
          completed_at: string | null;
        }> = [];

        if (hasPickup || pickupTs) {
          distInserts.push({
            enrollment_id: enrollment.id,
            method: "pickup",
            completed: hasPickup || !!pickupTs,
            completed_at: parseTimestamp(pickupTs),
          });
        }
        if (hasSchoolDel || schoolDelTs) {
          distInserts.push({
            enrollment_id: enrollment.id,
            method: "school_delivery",
            completed: hasSchoolDel || !!schoolDelTs,
            completed_at: parseTimestamp(schoolDelTs),
          });
        }
        if (hasBin || binTs) {
          distInserts.push({
            enrollment_id: enrollment.id,
            method: "bin",
            completed: hasBin || !!binTs,
            completed_at: parseTimestamp(binTs),
          });
        }

        if (distInserts.length > 0) {
          await supabase.from("distributions").insert(distInserts);
        }
      }

      result.created++;
    } catch (err) {
      result.errors++;
      result.errorMessages.push(
        `Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  // Reset the refresh_id sequence so new registrations get IDs above the imported ones
  await supabase.rpc("reset_refresh_id_sequence");

  return result;
}
