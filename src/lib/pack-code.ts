type MenstruationPreference = "Pads" | "Tampons" | "None" | null;

export function calculatePackCode(
  grade: string,
  gender: string,
  ethnicHair: boolean,
  menstruationPref: MenstruationPreference
): string {
  // Pre-K always gets code 0
  if (grade === "PK") return "0";

  const gradeNum = parseInt(grade, 10);

  // K-4: codes 1 or 2 based on ethnic hair preference
  if (gradeNum >= 0 && gradeNum <= 4) {
    return ethnicHair ? "2" : "1";
  }

  // Grades 5-12
  if (gradeNum >= 5 && gradeNum <= 12) {
    if (gender === "Female") {
      const base = ethnicHair ? "4" : "3";
      if (menstruationPref === "Pads") return base + "P";
      if (menstruationPref === "Tampons") return base + "T";
      return base;
    }
    // Male, Non-binary, Prefer not to say
    return ethnicHair ? "6" : "5";
  }

  return "0";
}
