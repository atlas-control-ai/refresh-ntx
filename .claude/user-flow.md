# Refresh North Texas — User Flow Reference

## System Layers
1. Household and student identity
2. Yearly enrollment
3. Distribution cycle fulfillment
4. Admin cleanup and reporting

## Core Principle
Family and student records persist across years. Enrollment is a yearly layer.
Distribution cycles are records, not columns. Submissions go straight in; issues are flagged for admin review.

## Key Flows

### First-time family
- Parent submits: guardian info, one or more children, district/school/grade, student ID, preferences
- Creates: family record, student record(s), enrollment(s), fulfillment placeholders for all active cycles
- 3 kids = 1 family + 3 students + 3 enrollments + 12 fulfillments (4 cycles)

### Returning family
- Parent logs in via email magic link
- System finds their family, shows existing children
- Confirm/update each child, add new children if needed
- Submit enrollment for new school year
- Creates new enrollment + fulfillment records — does NOT recreate family/student

### Student identity
- Permanent profile: name, DOB, gender, ethnicity, student ID, family
- Annual enrollment: grade, school, district, pack code, preferences, flags
- Student can change grade, school, needs year to year

### Enrollment submission
- Goes straight in, no approval gate
- System checks for existing family (email/phone), existing student (ID/name/DOB)
- Creates or updates family → creates or updates student → creates enrollment → calculates pack code → generates fulfillment records
- Flags issues (duplicate, missing ID, mismatch) but doesn't block

### Pack code
- Calculated from: grade, gender, menstruation need, hair preference
- Stored on enrollment record
- Admin can override (show calculated vs overridden + reason)

### Distribution cycles
- 4 per year: Aug, Nov, Feb, May
- Each student gets 1 fulfillment record per cycle
- Fulfillment status: pending, picked_up, school_delivered, binned, not_fulfilled, exception
- Scalable: adding/removing cycles doesn't change DB structure

### Fulfillment paths
- Path A: Parent pickup at event → search, mark pickup, auto-timestamp
- Path B: School delivery → filter by school, bulk mark
- Path C: Bin / alternate → mark bin completed

### Duplicate handling
- Submissions still created even if suspicious
- Flags: possible duplicate, missing student ID, student ID mismatch, unverified
- Admin cleanup queue: confirm not duplicate, merge records, correct ID, add notes

### Student ID verification
- At enrollment: unverified
- Admin/counselor can verify → locks from parent edits
- Re-enrollment: verified ID shown, not overwritable by parent

### Unenrollment
- Enrollment-level: inactive for a specific year
- Student-level: archived for long-term removal
- Don't delete — preserve history

### Year-to-year
- Admin creates new school year + cycles
- Parents re-enroll existing children
- Students persist, enrollments are new, fulfillments generated fresh
- History layered: Family → Student → Enrollments by year → Fulfillments by cycle

### Dashboard needs
- Overview: active families, students, enrollments, unverified IDs, duplicate flags, fulfillment by cycle
- Enrollment queue: recent, flagged, missing IDs, incomplete
- Distribution: choose cycle, filter, bulk mark, outstanding items
- Student/family profiles: full history, notes, flags
