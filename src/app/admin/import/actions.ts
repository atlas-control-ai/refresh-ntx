"use server";

import { createClient } from "@/lib/supabase/server";
import { calculatePackCode } from "@/lib/pack-code";

export interface ImportRow {
  // Guardian
  guardianFirstName: string;
  guardianLastName: string;
  email: string;
  phone: string;
  zipCode: string;
  county: string;
  // Child
  childFirstName: string;
  childLastName: string;
  dateOfBirth: string;
  schoolStudentId: string;
  grade: string;
  gender: string;
  ethnicity: string;
  ethnicHairPreference: string;
  menstruationPreference: string;
  // School
  schoolDistrict: string;
  schoolName: string;
  // Distribution
  packCode: string;
  pickupCompleted: string;
  pickupDate: string;
  schoolDeliveryCompleted: string;
  schoolDeliveryDate: string;
  binCompleted: string;
  binDate: string;
  // Meta
  submittedAt: string;
}

export interface ImportResult {
  total: number;
  created: number;
  duplicates: number;
  errors: number;
  errorMessages: string[];
}

export async function importCSVData(
  rows: ImportRow[],
  cycleId: string
): Promise<ImportResult> {
  const supabase = await createClient();
  const result: ImportResult = {
    total: rows.length,
    created: 0,
    duplicates: 0,
    errors: 0,
    errorMessages: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row + 0-index

    try {
      if (!row.childFirstName || !row.childLastName) {
        result.errors++;
        result.errorMessages.push(`Row ${rowNum}: Missing child name`);
        continue;
      }

      // Parse ethnicity — could be comma-separated
      const ethnicityArray = row.ethnicity
        ? row.ethnicity.split(",").map((e) => e.trim()).filter(Boolean)
        : [];

      const ethnicHair =
        row.ethnicHairPreference?.toLowerCase() === "yes" ||
        row.ethnicHairPreference?.toLowerCase() === "true";

      // Duplicate detection
      let isDuplicate = false;
      let duplicateNotes = "";

      if (row.childFirstName && row.childLastName && row.dateOfBirth) {
        const { data: potentialDupes } = await supabase
          .from("students")
          .select("id, first_name, last_name, date_of_birth, school_student_id, refresh_id")
          .ilike("first_name", row.childFirstName)
          .ilike("last_name", row.childLastName);

        if (potentialDupes) {
          for (const dupe of potentialDupes) {
            let signals = 0;
            if (
              dupe.first_name.toLowerCase() === row.childFirstName.toLowerCase() &&
              dupe.last_name.toLowerCase() === row.childLastName.toLowerCase()
            )
              signals++;
            if (dupe.date_of_birth === row.dateOfBirth) signals++;
            if (row.schoolStudentId && dupe.school_student_id === row.schoolStudentId)
              signals++;

            if (signals >= 2) {
              isDuplicate = true;
              duplicateNotes += `Import match: ${dupe.first_name} ${dupe.last_name} (Refresh ID: ${dupe.refresh_id}). `;
            }
          }
        }
      }

      if (isDuplicate) result.duplicates++;

      // Calculate pack code (use provided one if available, otherwise calculate)
      const gradeForCode = row.grade === "K" ? "0" : row.grade;
      const packCode =
        row.packCode ||
        calculatePackCode(
          gradeForCode,
          row.gender,
          ethnicHair,
          row.gender === "Female" && row.menstruationPreference
            ? (row.menstruationPreference as "Pads" | "Tampons" | "None")
            : null
        );

      // Insert student
      const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
          first_name: row.childFirstName,
          last_name: row.childLastName,
          date_of_birth: row.dateOfBirth || "2010-01-01",
          school_student_id: row.schoolStudentId || null,
          gender: row.gender || "Prefer not to say",
          ethnicity: ethnicityArray,
          ethnic_hair_preference: ethnicHair,
          is_duplicate: isDuplicate,
          notes: isDuplicate ? duplicateNotes.trim() : null,
        })
        .select("id")
        .single();

      if (studentError) {
        result.errors++;
        result.errorMessages.push(`Row ${rowNum}: ${studentError.message}`);
        continue;
      }

      // Insert guardian (if info provided)
      if (row.guardianFirstName && row.email) {
        await supabase.from("guardians").insert({
          student_id: student.id,
          first_name: row.guardianFirstName,
          last_name: row.guardianLastName || row.guardianFirstName,
          email: row.email,
          phone: row.phone || "",
          zip_code: row.zipCode || "",
          county: row.county || "",
          is_primary: true,
        });
      }

      // Insert enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          student_id: student.id,
          cycle_id: cycleId,
          pack_code: packCode,
          grade: row.grade || "K",
          menstruation_preference:
            row.gender === "Female" && row.menstruationPreference
              ? row.menstruationPreference
              : null,
          school_district: row.schoolDistrict || "Other",
          school_name: row.schoolName || "Unknown",
          submitted_at: row.submittedAt || new Date().toISOString(),
        })
        .select("id")
        .single();

      if (enrollmentError) {
        result.errors++;
        result.errorMessages.push(`Row ${rowNum}: Enrollment: ${enrollmentError.message}`);
        continue;
      }

      // Insert distributions if provided
      const distInserts: Array<{
        enrollment_id: string;
        method: string;
        completed: boolean;
        completed_at: string | null;
      }> = [];

      if (row.pickupCompleted?.toLowerCase() === "yes" || row.pickupCompleted?.toLowerCase() === "true" || row.pickupDate) {
        distInserts.push({
          enrollment_id: enrollment.id,
          method: "pickup",
          completed: true,
          completed_at: row.pickupDate || new Date().toISOString(),
        });
      }
      if (row.schoolDeliveryCompleted?.toLowerCase() === "yes" || row.schoolDeliveryCompleted?.toLowerCase() === "true" || row.schoolDeliveryDate) {
        distInserts.push({
          enrollment_id: enrollment.id,
          method: "school_delivery",
          completed: true,
          completed_at: row.schoolDeliveryDate || new Date().toISOString(),
        });
      }
      if (row.binCompleted?.toLowerCase() === "yes" || row.binCompleted?.toLowerCase() === "true" || row.binDate) {
        distInserts.push({
          enrollment_id: enrollment.id,
          method: "bin",
          completed: true,
          completed_at: row.binDate || new Date().toISOString(),
        });
      }

      if (distInserts.length > 0) {
        await supabase.from("distributions").insert(distInserts);
      }

      result.created++;
    } catch (err) {
      result.errors++;
      result.errorMessages.push(
        `Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return result;
}
